import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { ROLES, ROLE_VALUES } from '../config/constants.js';

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: ROLES.ADMIN,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    /** Set when the Super Admin creates the account; cleared on first login. */
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: { type: Date, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /** Password reset – only the SHA-256 hash of the token is stored. */
    resetPasswordTokenHash: { type: String, default: null, select: false },
    resetPasswordExpiresAt: { type: Date, default: null, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.resetPasswordTokenHash;
        delete ret.resetPasswordExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.virtual('isSuperAdmin').get(function isSuperAdmin() {
  return this.role === ROLES.SUPER_ADMIN;
});

/** Hashes and assigns a plaintext password. */
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  this.resetPasswordTokenHash = null;
  this.resetPasswordExpiresAt = null;
};

userSchema.methods.verifyPassword = function verifyPassword(plainPassword) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/**
 * Issues a single-use reset token. The raw token is returned (and emailed);
 * only its hash is persisted so a database leak cannot be replayed.
 */
userSchema.methods.createPasswordResetToken = function createPasswordResetToken(
  ttlMinutes,
) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordTokenHash = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.resetPasswordExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  return rawToken;
};

userSchema.statics.hashResetToken = (rawToken) =>
  crypto.createHash('sha256').update(String(rawToken)).digest('hex');

const User = mongoose.model('User', userSchema);

export default User;
