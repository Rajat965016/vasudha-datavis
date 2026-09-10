import env from '../config/env.js';
import { DATASET_STATUS, ROLES } from '../config/constants.js';
import Dataset from '../models/Dataset.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendDatasetReviewEmail } from '../utils/mailer.js';
import parseDatasetCsv from '../services/csvParser.js';
import { describeSchemas } from '../services/datasetSchemas.js';
import {
  approveDataset,
  assertChartTypeChangeAllowed,
  getDatasetForUser,
  getDatasetStats,
  listDatasets,
  normaliseVariant,
  rejectDataset,
} from '../services/datasetService.js';

/** GET /api/datasets/schemas — drives the Add Dataset form. */
export const getSchemas = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { schemas: describeSchemas() } });
});

/** GET /api/datasets */
export const getDatasets = asyncHandler(async (req, res) => {
  const result = await listDatasets({ user: req.user, query: req.query });
  res.json({ success: true, data: result });
});

/** GET /api/datasets/stats */
export const getStats = asyncHandler(async (req, res) => {
  const stats = await getDatasetStats({ user: req.user });
  res.json({ success: true, data: { stats } });
});

/** GET /api/datasets/:id — includes rows so the form can preview the data. */
export const getDataset = asyncHandler(async (req, res) => {
  const dataset = await getDatasetForUser(req.params.id, req.user);
  res.json({ success: true, data: { dataset } });
});

/**
 * POST /api/datasets
 * Accepts multipart/form-data with a `file` field. New datasets always start
 * as PENDING and stay hidden from the public site until approved.
 */
export const createDataset = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('A .csv file is required to create a dataset.');
  }

  const { title, description, domain, chartType, chartVariant, valueUnit } = req.body;
  const parsed = parseDatasetCsv(req.file.buffer, chartType);

  const dataset = await Dataset.create({
    title,
    description,
    domain,
    chartType,
    chartVariant: normaliseVariant(chartType, chartVariant),
    valueUnit,
    columns: parsed.columns,
    rows: parsed.rows,
    rowCount: parsed.rowCount,
    sourceFileName: req.file.originalname,
    status: DATASET_STATUS.PENDING,
    createdBy: req.user._id,
  });

  await dataset.populate('createdBy', 'name email role');

  res.status(201).json({
    success: true,
    message: `"${dataset.title}" was uploaded with ${parsed.rowCount} rows and is awaiting Super Admin approval.`,
    data: { dataset, meta: parsed.meta },
  });
});

/**
 * PUT /api/datasets/:id
 * An Admin may edit their own dataset; the Super Admin may edit any dataset.
 * Editing an approved dataset sends it back to PENDING for re-approval, but
 * keeps its original publish position.
 */
export const updateDataset = asyncHandler(async (req, res) => {
  const dataset = await getDatasetForUser(req.params.id, req.user);
  const { title, description, domain, chartType, chartVariant, valueUnit } = req.body;

  assertChartTypeChangeAllowed(dataset, chartType, Boolean(req.file));

  const nextChartType = chartType ?? dataset.chartType;

  if (req.file) {
    const parsed = parseDatasetCsv(req.file.buffer, nextChartType);
    dataset.columns = parsed.columns;
    dataset.rows = parsed.rows;
    dataset.rowCount = parsed.rowCount;
    dataset.sourceFileName = req.file.originalname;
  }

  if (title !== undefined) dataset.title = title;
  if (description !== undefined) dataset.description = description;
  if (domain !== undefined) dataset.domain = domain;
  if (valueUnit !== undefined) dataset.valueUnit = valueUnit;
  dataset.chartType = nextChartType;
  dataset.chartVariant = normaliseVariant(
    nextChartType,
    chartVariant !== undefined ? chartVariant : dataset.chartVariant,
  );
  dataset.updatedBy = req.user._id;

  // An Admin editing published content must go through review again.
  if (req.user.role !== ROLES.SUPER_ADMIN && dataset.status !== DATASET_STATUS.PENDING) {
    dataset.status = DATASET_STATUS.PENDING;
    dataset.rejectionReason = '';
    dataset.reviewedBy = null;
    dataset.reviewedAt = null;
  }

  await dataset.save();
  await dataset.populate('createdBy', 'name email role');

  res.json({
    success: true,
    message:
      dataset.status === DATASET_STATUS.PENDING
        ? 'Dataset updated and sent for Super Admin approval.'
        : 'Dataset updated.',
    data: { dataset },
  });
});

/** DELETE /api/datasets/:id */
export const deleteDataset = asyncHandler(async (req, res) => {
  const dataset = await getDatasetForUser(req.params.id, req.user);
  await dataset.deleteOne();
  res.json({ success: true, message: `"${dataset.title}" was deleted.` });
});

/** Notifies the author of a review decision; failures never block the review. */
const notifyAuthor = async (dataset, status, reason) => {
  await dataset.populate('createdBy', 'name email');
  const author = dataset.createdBy;
  if (!author?.email) return;

  await sendDatasetReviewEmail({
    name: author.name,
    email: author.email,
    title: dataset.title,
    status,
    reason,
    dashboardUrl: `${env.frontendUrl}/admin/datasets`,
  });
};

/** PATCH /api/datasets/:id/approve — Super Admin only. */
export const approve = asyncHandler(async (req, res) => {
  const dataset = await Dataset.findById(req.params.id);
  if (!dataset) throw ApiError.notFound('Dataset not found.');

  await approveDataset(dataset, req.user);
  await notifyAuthor(dataset, DATASET_STATUS.APPROVED);

  res.json({
    success: true,
    message: `"${dataset.title}" is now published on the public site.`,
    data: { dataset },
  });
});

/** PATCH /api/datasets/:id/reject — Super Admin only. */
export const reject = asyncHandler(async (req, res) => {
  const dataset = await Dataset.findById(req.params.id);
  if (!dataset) throw ApiError.notFound('Dataset not found.');

  await rejectDataset(dataset, req.user, req.body.reason);
  await notifyAuthor(dataset, DATASET_STATUS.REJECTED, req.body.reason);

  res.json({
    success: true,
    message: `"${dataset.title}" was rejected and remains hidden from the public site.`,
    data: { dataset },
  });
});
