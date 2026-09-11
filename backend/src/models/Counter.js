import { DataTypes, Model } from 'sequelize';

import sequelize from '../config/db.js';

/**
 * Atomic named counters.
 *
 * Used to allocate `datasets.publish_sequence`. Taking a row lock inside a
 * transaction is what makes two simultaneous approvals impossible to give the
 * same position on the public landing page.
 */
class Counter extends Model {
  static async next(name, transaction) {
    const [counter] = await Counter.findOrCreate({
      where: { name },
      defaults: { value: 0 },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    counter.value += 1;
    await counter.save({ transaction });
    return counter.value;
  }
}

Counter.init(
  {
    name: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Counter',
    tableName: 'counters',
    timestamps: false,
  },
);

export default Counter;
