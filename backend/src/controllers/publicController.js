import { DOMAIN_BY_SLUG, DOMAIN_VALUES } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  getDatasetStats,
  getPublishedDataset,
  listPublishedDatasets,
} from '../services/datasetService.js';

/** Accepts either `/climate` style slugs or the stored `CLIMATE` value. */
const resolveDomain = (raw) => {
  if (!raw) return null;
  const slug = String(raw).toLowerCase();
  if (DOMAIN_BY_SLUG[slug]) return DOMAIN_BY_SLUG[slug];
  const upper = String(raw).toUpperCase();
  if (DOMAIN_VALUES.includes(upper)) return upper;
  throw ApiError.badRequest(
    `Unknown domain "${raw}". Expected one of: ${Object.keys(DOMAIN_BY_SLUG).join(', ')}.`,
  );
};

/**
 * GET /api/public/visualisations?domain=climate
 * The single feed behind the landing page and every domain page. Results are
 * ordered by approval sequence, exactly as the public site must display them.
 */
export const getVisualisations = asyncHandler(async (req, res) => {
  const domain = resolveDomain(req.query.domain);
  const items = await listPublishedDatasets({ domain });

  res.json({
    success: true,
    data: { items, total: items.length, domain: domain ?? 'ALL' },
  });
});

/** GET /api/public/visualisations/:id */
export const getVisualisation = asyncHandler(async (req, res) => {
  const dataset = await getPublishedDataset(req.params.id);
  res.json({ success: true, data: { dataset } });
});

/** GET /api/public/stats — headline counts for the landing page. */
export const getPublicStats = asyncHandler(async (_req, res) => {
  const stats = await getDatasetStats();
  res.json({
    success: true,
    data: {
      stats: { published: stats.approved, byDomain: stats.byDomain },
    },
  });
});
