import { Router } from 'express';

import {
  approve,
  createDataset,
  deleteDataset,
  getDataset,
  getDatasets,
  getSchemas,
  getStats,
  reject,
  updateDataset,
} from '../controllers/datasetController.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import uploadCsv from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import {
  createDatasetSchema,
  listDatasetsQuerySchema,
  rejectDatasetSchema,
  updateDatasetSchema,
} from '../validators/datasetValidators.js';

const router = Router();

router.use(requireAuth);

router.get('/schemas', getSchemas);
router.get('/stats', getStats);

router
  .route('/')
  .get(validate(listDatasetsQuerySchema, 'query'), getDatasets)
  // `uploadCsv` runs first so multipart text fields are populated on req.body.
  .post(uploadCsv, validate(createDatasetSchema), createDataset);

router
  .route('/:id')
  .get(getDataset)
  .put(uploadCsv, validate(updateDatasetSchema), updateDataset)
  .delete(deleteDataset);

// Review actions — Super Admin only.
router.patch('/:id/approve', requireSuperAdmin, approve);
router.patch('/:id/reject', requireSuperAdmin, validate(rejectDatasetSchema), reject);

export default router;
