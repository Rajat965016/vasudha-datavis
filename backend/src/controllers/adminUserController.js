import crypto from 'node:crypto';

import { Op } from 'sequelize';

import env from '../config/env.js';
import sequelize from '../config/db.js';
import { DATASET_STATUS, ROLES } from '../config/constants.js';
import { Dataset, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { isMailEnabled, sendAdminWelcomeEmail } from '../utils/mailer.js';

/** Generates a password that satisfies the app's own strength rules. */
const generatePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*';
  const all = upper + lower + digits + symbols;

  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const core = Array.from({ length: 8 }, () => pick(all));
  const characters = [pick(upper), pick(lower), pick(digits), pick(symbols), ...core];

  // Fisher–Yates with a CSPRNG so the guaranteed characters are not positional.
  for (let i = characters.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters.join('');
};

const loginUrl = `${env.frontendUrl}/login`;

const EMPTY_COUNTS = {
  [DATASET_STATUS.PENDING]: 0,
  [DATASET_STATUS.APPROVED]: 0,
  [DATASET_STATUS.REJECTED]: 0,
};

/** GET /api/admins — Super Admin only. */
export const listAdmins = asyncHandler(async (req, res) => {
  const { search, status } = req.query;

  const where = { role: ROLES.ADMIN };
  if (search) {
    const safe = `%${String(search).replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    where[Op.or] = [{ name: { [Op.iLike]: safe } }, { email: { [Op.iLike]: safe } }];
  }
  if (status === 'active') where.isActive = true;
  if (status === 'disabled') where.isActive = false;

  const admins = await User.findAll({ where, order: [['createdAt', 'DESC']] });

  // One grouped query gives every Admin's contribution, rather than N queries.
  const counts = await Dataset.findAll({
    where: { createdById: { [Op.in]: admins.map((admin) => admin.id) } },
    attributes: [
      ['created_by_id', 'createdById'],
      'status',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['created_by_id', 'status'],
    raw: true,
  });

  const countsByAdmin = counts.reduce((acc, row) => {
    const key = String(row.createdById);
    acc[key] = { ...(acc[key] ?? {}), [row.status]: Number(row.count) };
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      items: admins.map((admin) => ({
        ...admin.toJSON(),
        datasetCounts: { ...EMPTY_COUNTS, ...(countsByAdmin[String(admin.id)] ?? {}) },
      })),
      total: admins.length,
    },
  });
});

/** POST /api/admins — creates an Admin account. */
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, sendCredentialsEmail } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists.');

  const plainPassword = password ?? generatePassword();
  const admin = User.build({
    name,
    email,
    role: ROLES.ADMIN,
    isActive: true,
    mustChangePassword: true,
    createdById: req.user.id,
  });
  await admin.setPassword(plainPassword);
  await admin.save();

  let emailResult = { delivered: false, reason: 'not-requested' };
  if (sendCredentialsEmail) {
    emailResult = await sendAdminWelcomeEmail({
      name: admin.name,
      email: admin.email,
      password: plainPassword,
      loginUrl,
    });
  }

  res.status(201).json({
    success: true,
    message: emailResult.delivered
      ? `Admin created. Credentials were emailed to ${admin.email}.`
      : 'Admin created. Share the temporary password securely — email delivery is not configured.',
    data: {
      user: admin.toJSON(),
      // Shown once in the UI when the credentials could not be emailed.
      temporaryPassword: emailResult.delivered ? undefined : plainPassword,
      email: { attempted: Boolean(sendCredentialsEmail), ...emailResult, enabled: isMailEnabled() },
    },
  });
});

const loadAdmin = async (id) => {
  const admin = await User.findByPk(id);
  if (!admin) throw ApiError.notFound('Admin account not found.');
  if (admin.role === ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('The Super Admin account cannot be managed from here.');
  }
  return admin;
};

/** PATCH /api/admins/:id — rename, enable or disable an Admin. */
export const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await loadAdmin(req.params.id);
  const { name, isActive } = req.body;

  if (name !== undefined) admin.name = name;
  if (isActive !== undefined) admin.isActive = isActive;
  await admin.save();

  res.json({
    success: true,
    message:
      isActive === undefined
        ? 'Admin updated.'
        : `Admin account ${isActive ? 'enabled' : 'disabled'}.`,
    data: { user: admin.toJSON() },
  });
});

/** POST /api/admins/:id/reset-password — issues a new temporary password. */
export const resetAdminPassword = asyncHandler(async (req, res) => {
  const admin = await loadAdmin(req.params.id);
  const { password, sendCredentialsEmail } = req.body;

  const plainPassword = password ?? generatePassword();
  await admin.setPassword(plainPassword);
  admin.mustChangePassword = true;
  await admin.save();

  let emailResult = { delivered: false, reason: 'not-requested' };
  if (sendCredentialsEmail) {
    emailResult = await sendAdminWelcomeEmail({
      name: admin.name,
      email: admin.email,
      password: plainPassword,
      loginUrl,
    });
  }

  res.json({
    success: true,
    message: emailResult.delivered
      ? `A new password was emailed to ${admin.email}.`
      : 'Password reset. Share the temporary password securely.',
    data: {
      temporaryPassword: emailResult.delivered ? undefined : plainPassword,
      email: { attempted: Boolean(sendCredentialsEmail), ...emailResult, enabled: isMailEnabled() },
    },
  });
});

/**
 * DELETE /api/admins/:id
 * Refused while the Admin still owns datasets — the foreign key is ON DELETE
 * RESTRICT for the same reason. Disabling is the safe alternative and keeps
 * the audit trail of who published what.
 */
export const deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await loadAdmin(req.params.id);

  const datasetCount = await Dataset.count({ where: { createdById: admin.id } });
  if (datasetCount > 0) {
    throw ApiError.conflict(
      `This Admin has ${datasetCount} dataset(s). Reassign or delete them first, or disable the account instead.`,
    );
  }

  await admin.destroy();
  res.json({ success: true, message: 'Admin account deleted.' });
});
