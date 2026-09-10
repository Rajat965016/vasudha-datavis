/** Mirrors `backend/src/config/constants.js` so labels live in one place. */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
};

export const DOMAINS = {
  CLIMATE: 'CLIMATE',
  ENERGY: 'ENERGY',
  POWER: 'POWER',
};

export const DOMAIN_META = {
  [DOMAINS.CLIMATE]: {
    label: 'Climate',
    slug: 'climate',
    blurb: 'Temperature, rainfall and climate indicators tracked across India.',
    accent: 'text-sky-700 bg-sky-50 ring-sky-200',
    dot: 'bg-sky-500',
  },
  [DOMAINS.ENERGY]: {
    label: 'Energy',
    slug: 'energy',
    blurb: 'Renewable capacity, generation mix and energy transition datasets.',
    accent: 'text-amber-700 bg-amber-50 ring-amber-200',
    dot: 'bg-amber-500',
  },
  [DOMAINS.POWER]: {
    label: 'Power',
    slug: 'power',
    blurb: 'Grid infrastructure, generation sites and power system datasets.',
    accent: 'text-violet-700 bg-violet-50 ring-violet-200',
    dot: 'bg-violet-500',
  },
};

export const DOMAIN_LIST = Object.values(DOMAINS);

export const CHART_TYPES = {
  MAP_POINTS: 'MAP_POINTS',
  STATE_HEATMAP: 'STATE_HEATMAP',
  TIME_SERIES: 'TIME_SERIES',
};

export const CHART_TYPE_META = {
  [CHART_TYPES.MAP_POINTS]: {
    label: 'Latitude / Longitude → India map',
    short: 'India map',
    hint: 'CSV needs latitude, longitude and value columns.',
  },
  [CHART_TYPES.STATE_HEATMAP]: {
    label: 'State-wise → India heatmap',
    short: 'State heatmap',
    hint: 'CSV needs state and value columns.',
  },
  [CHART_TYPES.TIME_SERIES]: {
    label: 'Time series → Line / Bar / Area chart',
    short: 'Time series',
    hint: 'CSV needs a date or year column and a value column.',
  },
};

export const CHART_VARIANTS = {
  LINE: 'LINE',
  BAR: 'BAR',
  AREA: 'AREA',
};

export const CHART_VARIANT_META = {
  [CHART_VARIANTS.LINE]: { label: 'Line chart' },
  [CHART_VARIANTS.BAR]: { label: 'Bar chart' },
  [CHART_VARIANTS.AREA]: { label: 'Area chart' },
};

export const DATASET_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const STATUS_META = {
  [DATASET_STATUS.PENDING]: {
    label: 'Pending approval',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  [DATASET_STATUS.APPROVED]: {
    label: 'Approved',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  [DATASET_STATUS.REJECTED]: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-800 ring-rose-200',
  },
};

export const DOMAIN_BY_SLUG = Object.fromEntries(
  Object.entries(DOMAIN_META).map(([domain, meta]) => [meta.slug, domain]),
);
