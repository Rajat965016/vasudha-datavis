import { Op } from 'sequelize';

import { CHART_TYPES, DATASET_STATUS, ROLES } from '../config/constants.js';
import sequelize from '../config/db.js';
import { Counter, Dataset, DatasetRow, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

const PUBLISH_COUNTER = 'dataset:publishSequence';

/** Author/reviewer columns worth exposing on the dashboards. */
const AUTHOR_ATTRIBUTES = ['id', 'name', 'email', 'role'];

/** Everything the public site is allowed to see about a dataset. */
const PUBLIC_ATTRIBUTES = [
  'id',
  'title',
  'description',
  'domain',
  'chartType',
  'chartVariant',
  'valueUnit',
  'columns',
  'rowCount',
  'publishedAt',
  'publishSequence',
];

const escapeLike = (value) => String(value).replace(/[%_\\]/g, (match) => `\\${match}`);

/* -------------------------------------------------------------------------- */
/* Row storage                                                                */
/* -------------------------------------------------------------------------- */

/** Loads a dataset's rows in upload order and unwraps the JSON payloads. */
export const loadRows = async (datasetId, transaction) => {
  const rows = await DatasetRow.findAll({
    where: { datasetId },
    order: [['rowIndex', 'ASC']],
    transaction,
  });
  return rows.map((row) => row.payload);
};

/** Loads rows for several datasets at once, grouped by dataset id. */
export const loadRowsForMany = async (datasetIds) => {
  if (datasetIds.length === 0) return new Map();

  const rows = await DatasetRow.findAll({
    where: { datasetId: { [Op.in]: datasetIds } },
    order: [
      ['datasetId', 'ASC'],
      ['rowIndex', 'ASC'],
    ],
  });

  const grouped = new Map(datasetIds.map((id) => [id, []]));
  rows.forEach((row) => {
    grouped.get(row.datasetId)?.push(row.payload);
  });
  return grouped;
};

/**
 * Replaces a dataset's rows wholesale. Called inside the same transaction as
 * the dataset write so a failed upload can never leave half the rows behind.
 */
export const replaceRows = async (datasetId, rows, transaction) => {
  await DatasetRow.destroy({ where: { datasetId }, transaction });
  if (rows.length === 0) return;

  await DatasetRow.bulkCreate(
    rows.map((payload, index) => ({ datasetId, rowIndex: index, payload })),
    // Chunked so a large CSV does not build one enormous INSERT statement.
    { transaction, validate: false },
  );
};

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

export const buildAdminListFilter = ({ user, query }) => {
  const where = {};

  // Admins only ever see their own datasets; the Super Admin sees everything.
  if (user.role !== ROLES.SUPER_ADMIN) {
    where.createdById = user.id;
  } else if (query.createdBy) {
    where.createdById = query.createdBy;
  }

  if (query.status) where.status = query.status;
  if (query.domain) where.domain = query.domain;
  if (query.chartType) where.chartType = query.chartType;
  if (query.search) where.title = { [Op.iLike]: `%${escapeLike(query.search)}%` };

  return where;
};

/**
 * Lists datasets for the dashboards. Rows are deliberately not loaded — a
 * table only needs metadata, which keeps dashboard responses small.
 */
export const listDatasets = async ({ user, query }) => {
  const where = buildAdminListFilter({ user, query });
  const { page, limit } = query;

  const { rows: items, count: total } = await Dataset.findAndCountAll({
    where,
    include: [
      { model: User, as: 'createdBy', attributes: AUTHOR_ATTRIBUTES },
      { model: User, as: 'reviewedBy', attributes: AUTHOR_ATTRIBUTES },
    ],
    order: [['createdAt', 'DESC']],
    offset: (page - 1) * limit,
    limit,
  });

  return {
    items: items.map((dataset) => dataset.toJSON()),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

/** Loads one dataset with its rows, enforcing ownership for non-super-admins. */
export const getDatasetForUser = async (id, user) => {
  const dataset = await Dataset.findByPk(id, {
    include: [
      { model: User, as: 'createdBy', attributes: AUTHOR_ATTRIBUTES },
      { model: User, as: 'reviewedBy', attributes: AUTHOR_ATTRIBUTES },
    ],
  });

  if (!dataset) throw ApiError.notFound('Dataset not found.');

  if (user.role !== ROLES.SUPER_ADMIN && dataset.createdById !== user.id) {
    throw ApiError.forbidden('You can only access datasets you created.');
  }

  return dataset;
};

/** Serialises a dataset together with its rows. */
export const withRows = async (dataset) => ({
  ...dataset.toJSON(),
  rows: await loadRows(dataset.id),
});

/* -------------------------------------------------------------------------- */
/* Review actions                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Approving allocates the next publish sequence number, which fixes the order
 * of charts on the public landing page. Re-approving keeps the original
 * position, so an edit does not reshuffle the page.
 */
export const approveDataset = async (dataset, reviewer) => {
  if (dataset.status === DATASET_STATUS.APPROVED) {
    throw ApiError.badRequest('This dataset is already approved.');
  }

  await sequelize.transaction(async (transaction) => {
    if (dataset.publishSequence == null) {
      dataset.publishSequence = await Counter.next(PUBLISH_COUNTER, transaction);
    }

    dataset.status = DATASET_STATUS.APPROVED;
    dataset.rejectionReason = '';
    dataset.reviewedById = reviewer.id;
    dataset.reviewedAt = new Date();
    dataset.publishedAt = dataset.publishedAt ?? new Date();

    await dataset.save({ transaction });
  });

  return dataset;
};

export const rejectDataset = async (dataset, reviewer, reason) => {
  if (dataset.status === DATASET_STATUS.REJECTED) {
    throw ApiError.badRequest('This dataset is already rejected.');
  }

  dataset.status = DATASET_STATUS.REJECTED;
  dataset.rejectionReason = reason;
  dataset.reviewedById = reviewer.id;
  dataset.reviewedAt = new Date();
  dataset.publishedAt = null;

  await dataset.save();
  return dataset;
};

/* -------------------------------------------------------------------------- */
/* Public feed                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Only approved datasets, ordered by the sequence in which they were approved,
 * optionally narrowed to a single domain. Rows are attached in one extra query
 * rather than one per dataset.
 */
export const listPublishedDatasets = async ({ domain } = {}) => {
  const where = { status: DATASET_STATUS.APPROVED };
  if (domain) where.domain = domain;

  const datasets = await Dataset.findAll({
    where,
    attributes: PUBLIC_ATTRIBUTES,
    order: [['publishSequence', 'ASC']],
  });

  const rowsByDataset = await loadRowsForMany(datasets.map((dataset) => dataset.id));

  return datasets.map((dataset) => ({
    ...dataset.toJSON(),
    rows: rowsByDataset.get(dataset.id) ?? [],
  }));
};

export const getPublishedDataset = async (id) => {
  const dataset = await Dataset.findOne({
    where: { id, status: DATASET_STATUS.APPROVED },
    attributes: PUBLIC_ATTRIBUTES,
  });

  if (!dataset) throw ApiError.notFound('This visualisation is not available.');

  return { ...dataset.toJSON(), rows: await loadRows(dataset.id) };
};

/* -------------------------------------------------------------------------- */
/* Statistics                                                                 */
/* -------------------------------------------------------------------------- */

/** Counts used by the dashboards and the public "at a glance" strip. */
export const getDatasetStats = async ({ user } = {}) => {
  const scope = user && user.role !== ROLES.SUPER_ADMIN ? { createdById: user.id } : {};

  const [byStatus, byDomain] = await Promise.all([
    Dataset.findAll({
      where: scope,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Dataset.findAll({
      where: { ...scope, status: DATASET_STATUS.APPROVED },
      attributes: ['domain', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['domain'],
      raw: true,
    }),
  ]);

  const toMap = (rows, key) =>
    rows.reduce((acc, row) => ({ ...acc, [row[key]]: Number(row.count) }), {});

  const statusCounts = toMap(byStatus, 'status');

  return {
    total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    pending: statusCounts[DATASET_STATUS.PENDING] ?? 0,
    approved: statusCounts[DATASET_STATUS.APPROVED] ?? 0,
    rejected: statusCounts[DATASET_STATUS.REJECTED] ?? 0,
    byDomain: toMap(byDomain, 'domain'),
  };
};

/* -------------------------------------------------------------------------- */
/* Guards                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Switching chart type is only allowed alongside a new CSV, because the stored
 * rows have the shape of the previous type.
 */
export const assertChartTypeChangeAllowed = (dataset, nextChartType, hasNewFile) => {
  if (!nextChartType || nextChartType === dataset.chartType) return;
  if (!hasNewFile) {
    throw ApiError.badRequest(
      'Changing the chart type requires uploading a CSV file that matches the new structure.',
    );
  }
};

/** Time-series datasets are the only ones where a variant is meaningful. */
export const normaliseVariant = (chartType, chartVariant) =>
  chartType === CHART_TYPES.TIME_SERIES ? chartVariant ?? null : null;

export { PUBLISH_COUNTER };
