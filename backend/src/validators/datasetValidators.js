import { z } from 'zod';

import {
  CHART_TYPES,
  CHART_TYPE_VALUES,
  CHART_VARIANT_VALUES,
  DATASET_STATUS_VALUES,
  DOMAIN_VALUES,
} from '../config/constants.js';

const titleSchema = z
  .string()
  .trim()
  .min(3, 'Chart title must be at least 3 characters.')
  .max(160, 'Chart title must be at most 160 characters.');

/**
 * The Add Dataset form is multipart/form-data, so every field arrives as a
 * string. `chartVariant` is required for — and only for — time-series charts.
 */
const baseDatasetShape = {
  title: titleSchema,
  description: z.string().trim().max(1000).optional().default(''),
  domain: z.enum(DOMAIN_VALUES, {
    errorMap: () => ({ message: `Domain must be one of: ${DOMAIN_VALUES.join(', ')}.` }),
  }),
  chartType: z.enum(CHART_TYPE_VALUES, {
    errorMap: () => ({ message: `Chart type must be one of: ${CHART_TYPE_VALUES.join(', ')}.` }),
  }),
  chartVariant: z
    .union([z.enum(CHART_VARIANT_VALUES), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined ? null : value)),
  valueUnit: z.string().trim().max(32).optional().default(''),
};

const requireVariantForTimeSeries = (data, ctx) => {
  if (data.chartType === CHART_TYPES.TIME_SERIES && !data.chartVariant) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['chartVariant'],
      message: 'Select a chart style (Line, Bar or Area) for time-series data.',
    });
  }
  if (data.chartType !== CHART_TYPES.TIME_SERIES && data.chartVariant) {
    // Silently ignore rather than reject – the variant is simply not applicable.
    // eslint-disable-next-line no-param-reassign
    data.chartVariant = null;
  }
};

export const createDatasetSchema = z
  .object(baseDatasetShape)
  .superRefine(requireVariantForTimeSeries);

/**
 * On update the CSV file is optional. When it is omitted the existing rows are
 * kept, which means the chart type cannot change (a different type needs
 * different columns) — enforced in the service layer.
 */
export const updateDatasetSchema = z
  .object({
    ...baseDatasetShape,
    chartType: baseDatasetShape.chartType.optional(),
    domain: baseDatasetShape.domain.optional(),
    title: titleSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.chartType) requireVariantForTimeSeries(data, ctx);
  });

export const rejectDatasetSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Please give the Admin a short reason for the rejection.')
    .max(500),
});

export const listDatasetsQuerySchema = z.object({
  status: z.enum(DATASET_STATUS_VALUES).optional(),
  domain: z.enum(DOMAIN_VALUES).optional(),
  chartType: z.enum(CHART_TYPE_VALUES).optional(),
  createdBy: z.string().trim().optional(),
  search: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
