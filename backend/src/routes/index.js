import { Router } from 'express';

import {
  CHART_TYPE_VALUES,
  CHART_VARIANT_VALUES,
  DATASET_STATUS_VALUES,
  DOMAIN_VALUES,
} from '../config/constants.js';
import adminUserRoutes from './adminUserRoutes.js';
import authRoutes from './authRoutes.js';
import datasetRoutes from './datasetRoutes.js';
import publicRoutes from './publicRoutes.js';

const router = Router();

/** Lightweight liveness probe used by the hosting platform. */
router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

/** Enumerations the frontend renders as dropdowns — keeps them in one place. */
router.get('/meta', (_req, res) => {
  res.json({
    success: true,
    data: {
      domains: DOMAIN_VALUES,
      chartTypes: CHART_TYPE_VALUES,
      chartVariants: CHART_VARIANT_VALUES,
      datasetStatuses: DATASET_STATUS_VALUES,
    },
  });
});

router.use('/auth', authRoutes);
router.use('/admins', adminUserRoutes);
router.use('/datasets', datasetRoutes);
router.use('/public', publicRoutes);

export default router;
