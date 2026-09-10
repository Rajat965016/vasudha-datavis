import { Router } from 'express';

import {
  getPublicStats,
  getVisualisation,
  getVisualisations,
} from '../controllers/publicController.js';

const router = Router();

// No authentication anywhere in this router — this is the public portal API.
router.get('/visualisations', getVisualisations);
router.get('/visualisations/:id', getVisualisation);
router.get('/stats', getPublicStats);

export default router;
