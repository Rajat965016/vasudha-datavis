import { DataTypes, Model } from 'sequelize';

import sequelize from '../config/db.js';
import {
  CHART_TYPES,
  CHART_TYPE_VALUES,
  CHART_VARIANT_VALUES,
  DATASET_STATUS,
  DATASET_STATUS_VALUES,
  DOMAIN_VALUES,
} from '../config/constants.js';

/**
 * MySQL's JSON columns come back parsed on MySQL 8 but as a string on MariaDB
 * (where JSON is an alias for LONGTEXT). This getter normalises both.
 */
const jsonGetter = (field, fallback) =>
  function get() {
    const raw = this.getDataValue(field);
    if (raw === null || raw === undefined) return fallback;
    if (typeof raw !== 'string') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

class Dataset extends Model {
  get isPublished() {
    return this.status === DATASET_STATUS.APPROVED;
  }

  /** Effective visualisation key, e.g. `TIME_SERIES:LINE` or `STATE_HEATMAP`. */
  get visualisationKey() {
    return this.chartType === CHART_TYPES.TIME_SERIES && this.chartVariant
      ? `${this.chartType}:${this.chartVariant}`
      : this.chartType;
  }

  toJSON() {
    const values = { ...this.get() };
    values.isPublished = this.status === DATASET_STATUS.APPROVED;
    values.visualisationKey = this.visualisationKey;
    // `rows` is attached by the service layer when a caller needs the data.
    if (this.dataValues.rows !== undefined) values.rows = this.dataValues.rows;
    return values;
  }
}

Dataset.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: { notEmpty: { msg: 'Chart title is required' } },
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      defaultValue: '',
    },
    domain: {
      type: DataTypes.ENUM(...DOMAIN_VALUES),
      allowNull: false,
    },
    chartType: {
      type: DataTypes.ENUM(...CHART_TYPE_VALUES),
      allowNull: false,
    },
    /** Only meaningful when `chartType === TIME_SERIES`. */
    chartVariant: {
      type: DataTypes.ENUM(...CHART_VARIANT_VALUES),
      allowNull: true,
      defaultValue: null,
    },
    /** Optional unit shown on the value axis and in tooltips, e.g. "MW". */
    valueUnit: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: '',
    },
    /**
     * Column metadata describing the uploaded CSV: key, source header, label,
     * type and role. Stored as JSON because the shape differs per chart type.
     */
    columns: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      get: jsonGetter('columns', []),
    },
    rowCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    sourceFileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
    },
    status: {
      type: DataTypes.ENUM(...DATASET_STATUS_VALUES),
      allowNull: false,
      defaultValue: DATASET_STATUS.PENDING,
    },
    rejectionReason: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
    },
    createdById: { type: DataTypes.INTEGER, allowNull: false },
    updatedById: { type: DataTypes.INTEGER, allowNull: true },
    reviewedById: { type: DataTypes.INTEGER, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    /**
     * Monotonically increasing publish counter, allocated on first approval.
     * The public landing page orders by this column, so charts appear in the
     * exact sequence they were approved.
     */
    publishSequence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: 'Dataset',
    tableName: 'datasets',
    indexes: [
      { fields: ['status', 'publish_sequence'] },
      { fields: ['status', 'domain', 'publish_sequence'] },
      { fields: ['created_by_id'] },
    ],
  },
);

export default Dataset;
