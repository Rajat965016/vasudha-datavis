import crypto from 'node:crypto';

import env from '../config/env.js';
import { ROLES } from '../config/constants.js';
import Dataset from '../models/Dataset.js';
import User from '../models/User.js';
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

/** GET /api/admins — Super Admin only. */
export const listAdmins = asyncHandler(async (req, res) => {
  const { search, status } = req.query;

  const filter = { role: ROLES.ADMIN };
  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }];
  }
  if (status === 'active') filter.isActive = true;
  if (status === 'disabled') filter.isActive = false;

  const admins = await User.find(filter).sort({ createdAt: -1 }).lean({ virtuals: true });

  // Attach a dataset count so the Super Admin can see each Admin's contribution.
  const counts = await Dataset.aggregate([
    { $match: { createdBy: { $in: admins.map((admin) => admin._id) } } },
    { $group: { _id: { createdBy: '$createdBy', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const countsByAdmin = counts.reduce((acc, row) => {
    const key = String(row._id.createdBy);
    acc[key] = { ...(acc[key] ?? {}), [row._id.status]: row.count };
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      items: admins.map((admin) => ({
        ...admin,
        datasetCounts: {
          PENDING: 0,
          APPROVED: 0,
          REJECTED: 0,
          ...(countsByAdmin[String(admin._id)] ?? {}),
        },
      })),
      total: admins.length,
    },
  });
});

/** POST /api/admins — creates an Admin account. */
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, sendCredentialsEmail } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with this email already exists.');

  const plainPassword = password ?? generatePassword();
  const admin = new User({
    name,
    email,
    role: ROLES.ADMIN,
    isActive: true,
    mustChangePassword: true,
    createdBy: req.user._id,
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
  const admin = await User.findById(id);
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
 * Refuses while the Admin still owns datasets — disabling is the safe
 * alternative and keeps the audit trail of who published what.
 */
export const deleteAdmin = asyncHandler(async (req, res) => {
  const admin = await loadAdmin(req.params.id);

  const datasetCount = await Dataset.countDocuments({ createdBy: admin._id });
  if (datasetCount > 0) {
    throw ApiError.conflict(
      `This Admin has ${datasetCount} dataset(s). Reassign or delete them first, or disable the account instead.`,
    );
  }

  await admin.deleteOne();
  res.json({ success: true, message: 'Admin account deleted.' });
});
