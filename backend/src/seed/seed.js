import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHART_TYPES, CHART_VARIANTS, DOMAINS, ROLES } from '../config/constants.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import Counter from '../models/Counter.js';
import Dataset from '../models/Dataset.js';
import User from '../models/User.js';
import parseDatasetCsv from '../services/csvParser.js';
import logger from '../utils/logger.js';
import { ensureSuperAdmin } from './ensureSuperAdmin.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const samplesDir = path.resolve(here, '../../samples');

/**
 * The three datasets shipped in the assignment's Resources folder, mapped to
 * the chart type each one demonstrates.
 */
const SAMPLE_DATASETS = [
  {
    file: 'temperature_timeseries.csv',
    title: 'Average Annual Temperature — India',
    description:
      'Mean annual surface temperature recorded across India between 2019 and 2025.',
    domain: DOMAINS.CLIMATE,
    chartType: CHART_TYPES.TIME_SERIES,
    chartVariant: CHART_VARIANTS.LINE,
    valueUnit: '°C',
  },
  {
    file: 'state_heatmap_data.csv',
    title: 'Renewable Energy Capacity — State Wise',
    description: 'Installed renewable energy capacity by state and union territory.',
    domain: DOMAINS.ENERGY,
    chartType: CHART_TYPES.STATE_HEATMAP,
    chartVariant: null,
    valueUnit: 'MW',
  },
  {
    file: 'latlong_map_data.csv',
    title: 'Power Generation Sites — India',
    description: 'Geo-located generation sites with their reported output.',
    domain: DOMAINS.POWER,
    chartType: CHART_TYPES.MAP_POINTS,
    chartVariant: null,
    valueUnit: 'MW',
  },
];

const DEMO_ADMIN = {
  name: 'Demo Admin',
  email: 'admin@vasudhaindia.org',
  password: 'Admin@123',
};

const withDemoData = process.argv.includes('--demo');

const seedDemoAdmin = async (superAdmin) => {
  let admin = await User.findOne({ email: DEMO_ADMIN.email });
  if (admin) {
    logger.info(`Demo Admin already present → ${admin.email}`);
    return admin;
  }

  admin = new User({
    name: DEMO_ADMIN.name,
    email: DEMO_ADMIN.email,
    role: ROLES.ADMIN,
    isActive: true,
    mustChangePassword: false,
    createdBy: superAdmin._id,
  });
  await admin.setPassword(DEMO_ADMIN.password);
  await admin.save();

  logger.info(`Demo Admin created → ${admin.email} / ${DEMO_ADMIN.password}`);
  return admin;
};

const seedSampleDatasets = async (admin, superAdmin) => {
  for (const sample of SAMPLE_DATASETS) {
    const existing = await Dataset.findOne({ title: sample.title });
    if (existing) {
      logger.info(`Sample dataset already present → ${sample.title}`);
      continue;
    }

    const csv = await fs.readFile(path.join(samplesDir, sample.file), 'utf8');
    const parsed = parseDatasetCsv(csv, sample.chartType);

    const dataset = await Dataset.create({
      ...sample,
      columns: parsed.columns,
      rows: parsed.rows,
      rowCount: parsed.rowCount,
      sourceFileName: sample.file,
      createdBy: admin._id,
    });

    // Publish them so a fresh deployment has something on the landing page.
    dataset.status = 'APPROVED';
    dataset.reviewedBy = superAdmin._id;
    dataset.reviewedAt = new Date();
    dataset.publishedAt = new Date();
    dataset.publishSequence = await Counter.next('dataset:publishSequence');
    await dataset.save();

    logger.info(`Sample dataset seeded → ${sample.title} (${parsed.rowCount} rows)`);
  }
};

const run = async () => {
  await connectDatabase();

  const superAdmin = await ensureSuperAdmin();

  if (withDemoData) {
    const admin = await seedDemoAdmin(superAdmin);
    await seedSampleDatasets(admin, superAdmin);
  }

  logger.info('Seed complete.');
  await disconnectDatabase();
  process.exit(0);
};

run().catch(async (error) => {
  logger.error('Seed failed:', error);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
