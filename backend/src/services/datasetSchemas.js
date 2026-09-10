import { CHART_TYPES } from '../config/constants.js';
import { resolveStateName } from '../config/indiaStates.js';

/**
 * ---------------------------------------------------------------------------
 * Dataset schema registry
 * ---------------------------------------------------------------------------
 * Every supported visualisation declares, in one place, which CSV columns it
 * needs and how each cell is parsed. The CSV parser, the validator and the
 * frontend chart renderer are all driven by this registry, so support for a new
 * dataset shape is added by appending a definition here — no branching logic
 * has to be touched anywhere else.
 */

const trim = (value) => String(value ?? '').trim();

/** Header matching is case/punctuation insensitive: "Lat (deg)" -> "latdeg". */
export const normaliseHeader = (header) =>
  trim(header)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const numberField = ({ min, max } = {}) => (raw) => {
  const text = trim(raw);
  if (text === '') return { ok: false, message: 'value is required' };
  const parsed = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: `"${text}" is not a valid number` };
  }
  if (min !== undefined && parsed < min) {
    return { ok: false, message: `${parsed} is below the minimum of ${min}` };
  }
  if (max !== undefined && parsed > max) {
    return { ok: false, message: `${parsed} is above the maximum of ${max}` };
  }
  return { ok: true, value: parsed };
};

const stateField = () => (raw) => {
  const text = trim(raw);
  if (text === '') return { ok: false, message: 'state is required' };
  const canonical = resolveStateName(text);
  if (!canonical) {
    return {
      ok: false,
      message: `"${text}" is not a recognised Indian state or union territory`,
    };
  }
  return { ok: true, value: canonical };
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/;
const YEAR_ONLY = /^\d{4}$/;
const MONTH_ONLY = /^\d{4}-\d{2}$/;
const DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

/**
 * Accepts a year (2024), a month (2024-03), an ISO date (2024-03-17) or a
 * dd/mm/yyyy date and returns both a sortable timestamp and a display label.
 */
const periodField = () => (raw) => {
  const text = trim(raw);
  if (text === '') return { ok: false, message: 'date/year is required' };

  if (YEAR_ONLY.test(text)) {
    const year = Number(text);
    if (year < 1800 || year > 2200) {
      return { ok: false, message: `"${text}" is not a plausible year` };
    }
    return { ok: true, value: text, meta: { sortKey: Date.UTC(year, 0, 1), granularity: 'year' } };
  }

  if (MONTH_ONLY.test(text)) {
    const [year, month] = text.split('-').map(Number);
    if (month < 1 || month > 12) {
      return { ok: false, message: `"${text}" has an invalid month` };
    }
    return {
      ok: true,
      value: text,
      meta: { sortKey: Date.UTC(year, month - 1, 1), granularity: 'month' },
    };
  }

  let isoText = text;
  const dmy = text.match(DMY);
  if (dmy) {
    const [, day, month, year] = dmy;
    isoText = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (ISO_DATE.test(isoText)) {
    const timestamp = Date.parse(isoText);
    if (Number.isNaN(timestamp)) {
      return { ok: false, message: `"${text}" is not a valid date` };
    }
    return {
      ok: true,
      value: isoText.slice(0, 10),
      meta: { sortKey: timestamp, granularity: 'day' },
    };
  }

  return {
    ok: false,
    message: `"${text}" is not a supported date/year format (use YYYY, YYYY-MM, YYYY-MM-DD or DD/MM/YYYY)`,
  };
};

const textField = ({ required = false, maxLength = 200 } = {}) => (raw) => {
  const text = trim(raw);
  if (text === '') {
    return required ? { ok: false, message: 'value is required' } : { ok: true, value: '' };
  }
  return { ok: true, value: text.slice(0, maxLength) };
};

/**
 * @typedef {Object} FieldDefinition
 * @property {string}   key       Key written into each normalised row.
 * @property {string}   label     Default UI label.
 * @property {string[]} aliases   Accepted header spellings (normalised).
 * @property {boolean}  required
 * @property {'number'|'string'|'date'} type
 * @property {'dimension'|'measure'|'meta'} role
 * @property {(raw: unknown) => {ok: boolean, value?: unknown, message?: string, meta?: object}} parse
 */

/** @type {Record<string, {label: string, description: string, fields: FieldDefinition[], supportsVariants: boolean}>} */
export const DATASET_SCHEMAS = Object.freeze({
  [CHART_TYPES.MAP_POINTS]: {
    label: 'Latitude / Longitude — India map',
    description:
      'Point data plotted on an interactive India map. Requires latitude, longitude and a numeric value.',
    supportsVariants: false,
    fields: [
      {
        key: 'latitude',
        label: 'Latitude',
        aliases: ['latitude', 'lat', 'ycoordinate', 'ycoord'],
        required: true,
        type: 'number',
        role: 'dimension',
        parse: numberField({ min: -90, max: 90 }),
      },
      {
        key: 'longitude',
        label: 'Longitude',
        aliases: ['longitude', 'long', 'lon', 'lng', 'xcoordinate', 'xcoord'],
        required: true,
        type: 'number',
        role: 'dimension',
        parse: numberField({ min: -180, max: 180 }),
      },
      {
        key: 'value',
        label: 'Value',
        aliases: ['value', 'val', 'amount', 'quantity', 'capacity', 'reading'],
        required: true,
        type: 'number',
        role: 'measure',
        parse: numberField(),
      },
      {
        key: 'label',
        label: 'Location',
        aliases: ['label', 'name', 'location', 'site', 'station', 'place', 'title'],
        required: false,
        type: 'string',
        role: 'meta',
        parse: textField(),
      },
      {
        key: 'category',
        label: 'Category',
        aliases: ['category', 'type', 'group', 'segment', 'source'],
        required: false,
        type: 'string',
        role: 'meta',
        parse: textField(),
      },
    ],
  },

  [CHART_TYPES.STATE_HEATMAP]: {
    label: 'State-wise — India heatmap',
    description:
      'State-level data rendered as an India choropleth. Requires a state name and a numeric value.',
    supportsVariants: false,
    fields: [
      {
        key: 'state',
        label: 'State / UT',
        aliases: ['state', 'statename', 'stnm', 'stateut', 'region', 'province'],
        required: true,
        type: 'string',
        role: 'dimension',
        parse: stateField(),
      },
      {
        key: 'value',
        label: 'Value',
        aliases: ['value', 'val', 'amount', 'quantity', 'capacity', 'total'],
        required: true,
        type: 'number',
        role: 'measure',
        parse: numberField(),
      },
    ],
  },

  [CHART_TYPES.TIME_SERIES]: {
    label: 'Time series — line / bar / area chart',
    description:
      'A value observed over time. Requires a date or year column and a numeric value.',
    supportsVariants: true,
    fields: [
      {
        key: 'period',
        label: 'Date / Year',
        aliases: ['date', 'year', 'period', 'month', 'timestamp', 'time', 'yearmonth'],
        required: true,
        type: 'date',
        role: 'dimension',
        parse: periodField(),
      },
      {
        key: 'value',
        label: 'Value',
        aliases: ['value', 'val', 'amount', 'quantity', 'reading', 'temperature', 'total'],
        required: true,
        type: 'number',
        role: 'measure',
        parse: numberField(),
      },
      {
        key: 'series',
        label: 'Series',
        aliases: ['series', 'category', 'group', 'name', 'label'],
        required: false,
        type: 'string',
        role: 'meta',
        parse: textField(),
      },
    ],
  },
});

export const getDatasetSchema = (chartType) => DATASET_SCHEMAS[chartType] ?? null;

/** Serialisable description of every supported chart type, for the Add Dataset form. */
export const describeSchemas = () =>
  Object.entries(DATASET_SCHEMAS).map(([chartType, schema]) => ({
    chartType,
    label: schema.label,
    description: schema.description,
    supportsVariants: schema.supportsVariants,
    requiredColumns: schema.fields
      .filter((field) => field.required)
      .map((field) => ({ key: field.key, label: field.label, aliases: field.aliases })),
    optionalColumns: schema.fields
      .filter((field) => !field.required)
      .map((field) => ({ key: field.key, label: field.label, aliases: field.aliases })),
  }));
