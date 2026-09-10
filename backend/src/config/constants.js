/** Application-wide enumerations shared by models, validators and services. */

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
});

export const ROLE_VALUES = Object.values(ROLES);

export const DOMAINS = Object.freeze({
  CLIMATE: 'CLIMATE',
  ENERGY: 'ENERGY',
  POWER: 'POWER',
});

export const DOMAIN_VALUES = Object.values(DOMAINS);

/** Maps the public URL segment (`/climate`) to the stored domain value. */
export const DOMAIN_BY_SLUG = Object.freeze({
  climate: DOMAINS.CLIMATE,
  energy: DOMAINS.ENERGY,
  power: DOMAINS.POWER,
});

export const CHART_TYPES = Object.freeze({
  /** Latitude + Longitude -> interactive India map */
  MAP_POINTS: 'MAP_POINTS',
  /** State-wise data -> India state-level choropleth heatmap */
  STATE_HEATMAP: 'STATE_HEATMAP',
  /** Date/Year series -> line, bar or area chart */
  TIME_SERIES: 'TIME_SERIES',
});

export const CHART_TYPE_VALUES = Object.values(CHART_TYPES);

/** Only meaningful for TIME_SERIES datasets. */
export const CHART_VARIANTS = Object.freeze({
  LINE: 'LINE',
  BAR: 'BAR',
  AREA: 'AREA',
});

export const CHART_VARIANT_VALUES = Object.values(CHART_VARIANTS);

export const DATASET_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const DATASET_STATUS_VALUES = Object.values(DATASET_STATUS);
