import mongoose from 'mongoose';

import {
  CHART_TYPES,
  CHART_TYPE_VALUES,
  CHART_VARIANT_VALUES,
  DATASET_STATUS,
  DATASET_STATUS_VALUES,
  DOMAIN_VALUES,
} from '../config/constants.js';

/**
 * Describes one column of the uploaded CSV so the frontend can render axes,
 * tooltips and tables without knowing anything about the specific dataset.
 */
const columnSchema = new mongoose.Schema(
  {
    /** Key used inside every `rows` object. */
    key: { type: String, required: true },
    /** Original header text from the CSV. */
    sourceHeader: { type: String, required: true },
    /** Human friendly label shown in the UI. */
    label: { type: String, required: true },
    /** `number` | `string` | `date` */
    type: { type: String, required: true },
    /** `category` (x-axis / dimension) or `measure` (y-axis / value). */
    role: { type: String, default: 'meta' },
  },
  { _id: false },
);

const datasetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Chart title is required'],
      trim: true,
      maxlength: 160,
    },
    description: { type: String, trim: true, maxlength: 1000, default: '' },

    domain: {
      type: String,
      enum: DOMAIN_VALUES,
      required: true,
      index: true,
    },
    chartType: {
      type: String,
      enum: CHART_TYPE_VALUES,
      required: true,
    },
    /** Only used when `chartType === TIME_SERIES`. */
    chartVariant: {
      type: String,
      enum: [...CHART_VARIANT_VALUES, null],
      default: null,
    },

    /** Optional unit shown on the value axis / in tooltips, e.g. "MW", "°C". */
    valueUnit: { type: String, trim: true, maxlength: 32, default: '' },

    columns: { type: [columnSchema], default: [] },
    /** Normalised, validated CSV rows. Mixed so any extra column survives. */
    rows: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rowCount: { type: Number, default: 0 },

    sourceFileName: { type: String, default: '' },

    status: {
      type: String,
      enum: DATASET_STATUS_VALUES,
      default: DATASET_STATUS.PENDING,
      index: true,
    },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },

    /** Timestamp of the approval that published this dataset. */
    publishedAt: { type: Date, default: null },
    /**
     * Monotonically increasing publish counter. The public landing page orders
     * by this field so charts appear in the exact sequence they were approved.
     */
    publishSequence: { type: Number, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

datasetSchema.index({ status: 1, publishSequence: 1 });
datasetSchema.index({ status: 1, domain: 1, publishSequence: 1 });

datasetSchema.virtual('isPublished').get(function isPublished() {
  return this.status === DATASET_STATUS.APPROVED;
});

/** Effective visualisation key, e.g. `TIME_SERIES:LINE` or `STATE_HEATMAP`. */
datasetSchema.virtual('visualisationKey').get(function visualisationKey() {
  return this.chartType === CHART_TYPES.TIME_SERIES && this.chartVariant
    ? `${this.chartType}:${this.chartVariant}`
    : this.chartType;
});

datasetSchema.pre('save', function syncRowCount(next) {
  if (this.isModified('rows')) {
    this.rowCount = this.rows?.length ?? 0;
  }
  next();
});

const Dataset = mongoose.model('Dataset', datasetSchema);

export default Dataset;
