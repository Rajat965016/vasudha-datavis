import env from '../config/env.js';
import { ROLES } from '../config/constants.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Creates the default Super Admin the first time the app connects to an empty
 * database. Running on every boot means a fresh deployment is immediately
 * usable with the documented credentials — the assignment's requirement that
 * "a default Super Admin account should be created during deployment".
 *
 * An existing Super Admin is never modified, so a changed password survives
 * restarts and redeploys.
 */
export const ensureSuperAdmin = async () => {
  const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existing) {
    logger.info(`Super Admin present → ${existing.email}`);
    return existing;
  }

  const superAdmin = new User({
    name: env.superAdmin.name,
    email: env.superAdmin.email,
    role: ROLES.SUPER_ADMIN,
    isActive: true,
    mustChangePassword: false,
  });
  await superAdmin.setPassword(env.superAdmin.password);
  await superAdmin.save();

  logger.info(`Super Admin created → ${superAdmin.email}`);
  return superAdmin;
};

export default ensureSuperAdmin;
