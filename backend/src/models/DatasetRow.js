import { DataTypes, Model } from 'sequelize';

import sequelize from '../config/db.js';

/**
 * One validated row of an uploaded CSV.
 *
 * The rows live in their own table rather than inside the `datasets` record so
 * that dashboard queries never have to read the data, deletes cascade cleanly,
 * and a dataset is not limited by a single row's size. The per-row values stay
 * in a JSON column because each chart type has a different set of columns —
 * `columns` on the parent dataset describes what is inside.
 */
class DatasetRow extends Model {}

DatasetRow.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    datasetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    /** Preserves the order established at upload time (chronological for series). */
    rowIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        const raw = this.getDataValue('payload');
        if (raw === null || raw === undefined) return {};
        if (typeof raw !== 'string') return raw;
        try {
          return JSON.parse(raw);
        } catch {
          return {};
        }
      },
    },
  },
  {
    sequelize,
    modelName: 'DatasetRow',
    tableName: 'dataset_rows',
    // Rows are immutable once written; a re-upload replaces them wholesale.
    timestamps: false,
    indexes: [{ unique: true, fields: ['dataset_id', 'row_index'] }],
  },
);

export default DatasetRow;
