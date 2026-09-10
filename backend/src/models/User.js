import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import { DataTypes, Model } from 'sequelize';

import sequelize from '../config/db.js';
import { ROLES, ROLE_VALUES } from '../config/constants.js';

const SALT_ROUNDS = 10;

/** Columns that must never reach an API response. */
export const USER_PRIVATE_FIELDS = [
  'passwordHash',
  'resetPasswordTokenHash',
  'resetPasswordExpiresAt',
];

class User extends Model {
  get isSuperAdmin() {
    return this.role === ROLES.SUPER_ADMIN;
  }

  /** Hashes and assigns a plaintext password, clearing any pending reset. */
  async setPassword(plainPassword) {
    this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    this.resetPasswordTokenHash = null;
    this.resetPasswordExpiresAt = null;
  }

  verifyPassword(plainPassword) {
    if (!this.passwordHash) return Promise.resolve(false);
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  /**
   * Issues a single-use reset token. The raw token is returned (and emailed);
   * only its SHA-256 hash is persisted, so a database leak cannot be replayed.
   */
  createPasswordResetToken(ttlMinutes) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordTokenHash = User.hashResetToken(rawToken);
    this.resetPasswordExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    return rawToken;
  }

  static hashResetToken(rawToken) {
    return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
  }

  /** Strips secrets and exposes the derived `isSuperAdmin` flag. */
  toJSON() {
    const values = { ...this.get() };
    USER_PRIVATE_FIELDS.forEach((field) => delete values[field]);
    values.isSuperAdmin = this.role === ROLES.SUPER_ADMIN;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: { msg: 'Name is required' } },
    },
    email: {
      // 190 keeps the unique index within the utf8mb4 key-length limit on
      // older MySQL/MariaDB versions.
      type: DataTypes.STRING(190),
      allowNull: false,
      unique: true,
      validate: { isEmail: { msg: 'Enter a valid email address' } },
      set(value) {
        this.setDataValue('email', String(value ?? '').trim().toLowerCase());
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...ROLE_VALUES),
      allowNull: false,
      defaultValue: ROLES.ADMIN,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    /** Set when the Super Admin issues a temporary password. */
    mustChangePassword: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    createdById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    resetPasswordTokenHash: { type: DataTypes.CHAR(64), allowNull: true },
    resetPasswordExpiresAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    indexes: [
      { fields: ['role'] },
      { fields: ['is_active'] },
      { fields: ['reset_password_token_hash'] },
    ],
  },
);

export default User;
