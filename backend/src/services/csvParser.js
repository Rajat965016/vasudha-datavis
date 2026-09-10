import Papa from 'papaparse';

import env from '../config/env.js';
import { CHART_TYPES } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import { getDatasetSchema, normaliseHeader } from './datasetSchemas.js';

const MAX_REPORTED_ERRORS = 50;

/**
 * Matches the CSV headers against a schema's field definitions.
 *
 * Two passes, so an exact header always wins over a fuzzy one:
 *   1. exact alias match — `Value` / `value` / `VALUE` all hit the `value` alias
 *   2. prefix match      — `Reading (kWh)` -> `readingkwh` starts with `reading`
 *
 * A header can only be claimed once, which keeps a file containing both
 * `Value` and `Value (MW)` unambiguous.
 *
 * @returns {{mapping: Map<string,string>, missing: object[], unmapped: string[]}}
 */
const mapHeaders = (headers, schema) => {
  /** normalised header -> original header, first occurrence wins */
  const available = new Map();
  headers.forEach((header) => {
    const key = normaliseHeader(header);
    if (key && !available.has(key)) available.set(key, header);
  });

  const mapping = new Map(); // field.key -> original CSV header
  const consumed = new Set(); // normalised headers already claimed

  const claim = (fieldKey, normalisedHeader) => {
    mapping.set(fieldKey, available.get(normalisedHeader));
    consumed.add(normalisedHeader);
  };

  // Pass 1 — exact alias matches.
  schema.fields.forEach((field) => {
    const hit = field.aliases.find(
      (alias) => available.has(alias) && !consumed.has(alias),
    );
    if (hit) claim(field.key, hit);
  });

  // Pass 2 — headers that merely start with an alias, e.g. a trailing unit.
  // Longer aliases are tried first so `temperature` beats `temp`.
  schema.fields.forEach((field) => {
    if (mapping.has(field.key)) return;

    const sortedAliases = [...field.aliases].sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      const hit = [...available.keys()].find(
        (key) => !consumed.has(key) && key.startsWith(alias),
      );
      if (hit) {
        claim(field.key, hit);
        return;
      }
    }
  });

  const missing = schema.fields
    .filter((field) => field.required && !mapping.has(field.key))
    .map((field) => ({ key: field.key, label: field.label, aliases: field.aliases }));

  const unmapped = headers.filter(
    (header) => header && !consumed.has(normaliseHeader(header)),
  );

  return { mapping, missing, unmapped };
};

/**
 * Parses and validates a CSV buffer against the schema for `chartType`.
 *
 * Returns normalised rows plus column metadata. Throws a 422 `ApiError`
 * carrying per-row, per-column error details when the file is malformed —
 * which is what the Add Dataset form surfaces to the Admin.
 *
 * @param {Buffer|string} input Raw CSV contents.
 * @param {string} chartType One of `CHART_TYPES`.
 */
export const parseDatasetCsv = (input, chartType) => {
  const schema = getDatasetSchema(chartType);
  if (!schema) {
    throw ApiError.badRequest(`Unsupported chart type: ${chartType}`);
  }

  const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input ?? '');
  // Strip a UTF-8 BOM, which Excel adds and which would corrupt the first header.
  const csvText = text.replace(/^﻿/, '').trim();

  if (!csvText) {
    throw ApiError.unprocessable('The uploaded CSV file is empty.', {
      errors: [{ row: null, column: null, message: 'No content found in the file.' }],
    });
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => String(header ?? '').trim(),
  });

  const headers = (parsed.meta?.fields ?? []).filter(Boolean);
  if (headers.length === 0) {
    throw ApiError.unprocessable('The CSV file has no header row.', {
      errors: [
        {
          row: 1,
          column: null,
          message: 'Expected a header row naming each column.',
        },
      ],
    });
  }

  const { mapping, missing, unmapped } = mapHeaders(headers, schema);

  if (missing.length > 0) {
    throw ApiError.unprocessable(
      `The CSV is missing ${missing.length} required column(s) for this chart type.`,
      {
        missingColumns: missing,
        foundColumns: headers,
        errors: missing.map((field) => ({
          row: 1,
          column: field.label,
          message: `Required column "${field.label}" not found. Accepted headers: ${field.aliases.join(', ')}.`,
        })),
      },
    );
  }

  const records = parsed.data ?? [];
  if (records.length === 0) {
    throw ApiError.unprocessable('The CSV file contains a header but no data rows.', {
      errors: [{ row: 2, column: null, message: 'At least one data row is required.' }],
    });
  }

  if (records.length > env.maxDatasetRows) {
    throw ApiError.unprocessable(
      `The CSV has ${records.length} rows, which exceeds the ${env.maxDatasetRows} row limit.`,
    );
  }

  const errors = [];
  const rows = [];
  const seenStates = new Set();
  let granularity = null;

  records.forEach((record, index) => {
    // +2 => 1 for the header row, 1 because spreadsheets are 1-indexed.
    const rowNumber = index + 2;
    const normalised = {};
    let rowHasError = false;

    schema.fields.forEach((field) => {
      const header = mapping.get(field.key);
      if (!header) return; // optional column not present in this file

      const raw = record[header];
      const isBlank = raw === undefined || raw === null || String(raw).trim() === '';
      if (isBlank && !field.required) return;

      const result = field.parse(raw);
      if (!result.ok) {
        rowHasError = true;
        if (errors.length < MAX_REPORTED_ERRORS) {
          errors.push({ row: rowNumber, column: header, message: result.message });
        }
        return;
      }

      normalised[field.key] = result.value;
      if (field.key === 'period' && result.meta) {
        normalised.periodSort = result.meta.sortKey;
        granularity = granularity ?? result.meta.granularity;
      }
    });

    if (rowHasError) return;

    // Duplicate states would silently overwrite each other on the choropleth.
    if (chartType === CHART_TYPES.STATE_HEATMAP) {
      if (seenStates.has(normalised.state)) {
        if (errors.length < MAX_REPORTED_ERRORS) {
          errors.push({
            row: rowNumber,
            column: mapping.get('state'),
            message: `Duplicate entry for "${normalised.state}". Each state may appear only once.`,
          });
        }
        return;
      }
      seenStates.add(normalised.state);
    }

    // Preserve any additional columns so nothing from the source file is lost.
    unmapped.forEach((header) => {
      const raw = record[header];
      if (raw === undefined || raw === null || String(raw).trim() === '') return;
      normalised[`extra:${header}`] = String(raw).trim();
    });

    rows.push(normalised);
  });

  if (errors.length > 0) {
    throw ApiError.unprocessable(
      `The CSV file contains ${errors.length >= MAX_REPORTED_ERRORS ? `${MAX_REPORTED_ERRORS}+` : errors.length} invalid value(s). Please correct them and upload again.`,
      { errors, validRowCount: rows.length, totalRowCount: records.length },
    );
  }

  if (rows.length === 0) {
    throw ApiError.unprocessable('No valid data rows could be read from the CSV file.');
  }

  if (chartType === CHART_TYPES.TIME_SERIES) {
    rows.sort((a, b) => (a.periodSort ?? 0) - (b.periodSort ?? 0));
  }

  const columns = schema.fields
    .filter((field) => mapping.has(field.key))
    .map((field) => ({
      key: field.key,
      sourceHeader: mapping.get(field.key),
      label: field.label,
      type: field.type,
      role: field.role,
    }));

  unmapped.forEach((header) => {
    columns.push({
      key: `extra:${header}`,
      sourceHeader: header,
      label: header,
      type: 'string',
      role: 'meta',
    });
  });

  return {
    columns,
    rows,
    rowCount: rows.length,
    meta: {
      granularity,
      unmappedColumns: unmapped,
      detectedColumns: headers,
    },
  };
};

export default parseDatasetCsv;
