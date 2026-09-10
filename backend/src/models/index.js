import sequelize from '../config/db.js';
import Counter from './Counter.js';
import Dataset from './Dataset.js';
import DatasetRow from './DatasetRow.js';
import User from './User.js';

/* -------------------------------------------------------------------------- */
/* Associations                                                               */
/* -------------------------------------------------------------------------- */

// Who created which Admin account.
User.belongsTo(User, { as: 'createdByUser', foreignKey: 'createdById', onDelete: 'SET NULL' });

// A dataset is authored by exactly one user, and optionally edited/reviewed.
Dataset.belongsTo(User, {
  as: 'createdBy',
  foreignKey: { name: 'createdById', allowNull: false },
  // Authorship is part of the audit trail, so an author who still owns
  // datasets cannot be deleted.
  onDelete: 'RESTRICT',
});
Dataset.belongsTo(User, { as: 'updatedBy', foreignKey: 'updatedById', onDelete: 'SET NULL' });
Dataset.belongsTo(User, { as: 'reviewedBy', foreignKey: 'reviewedById', onDelete: 'SET NULL' });

User.hasMany(Dataset, { as: 'datasets', foreignKey: 'createdById' });

// Deleting a dataset removes its rows.
Dataset.hasMany(DatasetRow, { as: 'datasetRows', foreignKey: 'datasetId', onDelete: 'CASCADE' });
DatasetRow.belongsTo(Dataset, { as: 'dataset', foreignKey: 'datasetId' });

/* -------------------------------------------------------------------------- */
/* Schema creation                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Creates any missing tables. `alter` is intentionally never used: it can
 * rewrite live tables in surprising ways. For deliberate schema changes use
 * `database/schema.sql`.
 */
export const syncDatabase = async ({ force = false } = {}) => {
  await sequelize.sync({ force });
};

export { sequelize, User, Dataset, DatasetRow, Counter };
