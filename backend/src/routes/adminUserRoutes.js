import { Router } from 'express';

import {
  createAdmin,
  deleteAdmin,
  listAdmins,
  resetAdminPassword,
  updateAdmin,
} from '../controllers/adminUserController.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createAdminSchema,
  resetAdminPasswordSchema,
  updateAdminSchema,
} from '../validators/userValidators.js';

const router = Router();

// Every route below is Super Admin territory.
router.use(requireAuth, requireSuperAdmin);

router.route('/').get(listAdmins).post(validate(createAdminSchema), createAdmin);

router.route('/:id').patch(validate(updateAdminSchema), updateAdmin).delete(deleteAdmin);

router.post('/:id/reset-password', validate(resetAdminPasswordSchema), resetAdminPassword);

export default router;
