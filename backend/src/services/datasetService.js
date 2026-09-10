import { CHART_TYPES, DATASET_STATUS, ROLES } from '../config/constants.js';
import Counter from '../models/Counter.js';
import Dataset from '../models/Dataset.js';
import ApiError from '../utils/ApiError.js';

const PUBLISH_COUNTER = 'dataset:publishSequence';

/** Fields returned to the public site — never leaks reviewer/author internals. */
const PUBLIC_FIELDS =
  'title description domain chartType chartVariant valueUnit columns rows rowCount publishedAt publishSequence';

export const buildAdminListFilter = ({ user, query }) => {
  const filter = {};

  // Admins only ever see their own datasets; the Super Admin sees everything.
  if (user.role !== ROLES.SUPER_ADMIN) {
    filter.createdBy = user._id;
  } else if (query.createdBy) {
    filter.createdBy = query.createdBy;
  }

  if (query.status) filter.status = query.status;
  if (query.domain) filter.domain = query.domain;
  if (query.chartType) filter.chartType = query.chartType;
  if (query.search) {
    filter.title = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  return filter;
};

/**
 * Lists datasets for the dashboards. `rows` are excluded because a table only
 * needs metadata — this keeps dashboard responses small.
 */
export const listDatasets = async ({ user, query }) => {
  const filter = buildAdminListFilter({ user, query });
  const { page, limit } = query;

  const [items, total] = await Promise.all([
    Dataset.find(filter)
      .select('-rows')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('createdBy', 'name email role')
      .populate('reviewedBy', 'name email')
      .lean({ virtuals: true }),
    Dataset.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
};

/** Loads one dataset and enforces ownership for non-super-admins. */
export const getDatasetForUser = async (id, user) => {
  const dataset = await Dataset.findById(id)
    .populate('createdBy', 'name email role')
    .populate('reviewedBy', 'name email');

  if (!dataset) throw ApiError.notFound('Dataset not found.');

  const isOwner = String(dataset.createdBy?._id ?? dataset.createdBy) === String(user._id);
  if (user.role !== ROLES.SUPER_ADMIN && !isOwner) {
    throw ApiError.forbidden('You can only access datasets you created.');
  }

  return dataset;
};

/**
 * Approving assigns the next publish sequence number, which is what fixes the
 * order of charts on the public landing page. Re-approving keeps the original
 * position so an edit does not reshuffle the page.
 */
export const approveDataset = async (dataset, reviewer) => {
  if (dataset.status === DATASET_STATUS.APPROVED) {
    throw ApiError.badRequest('This dataset is already approved.');
  }

  if (dataset.publishSequence == null) {
    dataset.publishSequence = await Counter.next(PUBLISH_COUNTER);
  }

  dataset.status = DATASET_STATUS.APPROVED;
  dataset.rejectionReason = '';
  dataset.reviewedBy = reviewer._id;
  dataset.reviewedAt = new Date();
  dataset.publishedAt = dataset.publishedAt ?? new Date();

  await dataset.save();
  return dataset;
};

export const rejectDataset = async (dataset, reviewer, reason) => {
  if (dataset.status === DATASET_STATUS.REJECTED) {
    throw ApiError.badRequest('This dataset is already rejected.');
  }

  dataset.status = DATASET_STATUS.REJECTED;
  dataset.rejectionReason = reason;
  dataset.reviewedBy = reviewer._id;
  dataset.reviewedAt = new Date();
  dataset.publishedAt = null;

  await dataset.save();
  return dataset;
};

/**
 * Public feed. Only approved datasets, ordered by the sequence in which they
 * were approved, optionally narrowed to a single domain.
 */
export const listPublishedDatasets = async ({ domain } = {}) => {
  const filter = { status: DATASET_STATUS.APPROVED };
  if (domain) filter.domain = domain;

  return Dataset.find(filter)
    .select(PUBLIC_FIELDS)
    .sort({ publishSequence: 1 })
    .lean({ virtuals: true });
};

export const getPublishedDataset = async (id) => {
  const dataset = await Dataset.findOne({ _id: id, status: DATASET_STATUS.APPROVED })
    .select(PUBLIC_FIELDS)
    .lean({ virtuals: true });

  if (!dataset) throw ApiError.notFound('This visualisation is not available.');
  return dataset;
};

/** Counts used by the dashboards and the public "at a glance" strip. */
export const getDatasetStats = async ({ user } = {}) => {
  const match = user && user.role !== ROLES.SUPER_ADMIN ? { createdBy: user._id } : {};

  const [byStatus, byDomain] = await Promise.all([
    Dataset.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Dataset.aggregate([
      { $match: { ...match, status: DATASET_STATUS.APPROVED } },
      { $group: { _id: '$domain', count: { $sum: 1 } } },
    ]),
  ]);

  const toMap = (rows) => rows.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});
  const statusCounts = toMap(byStatus);

  return {
    total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    pending: statusCounts[DATASET_STATUS.PENDING] ?? 0,
    approved: statusCounts[DATASET_STATUS.APPROVED] ?? 0,
    rejected: statusCounts[DATASET_STATUS.REJECTED] ?? 0,
    byDomain: toMap(byDomain),
  };
};

/**
 * Guards a chart-type change on update: switching type is only allowed when a
 * new CSV is supplied, because the existing rows have the old shape.
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
