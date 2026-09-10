// `en-US` compact renders 24500 as "24.5K"; the `en-IN` equivalent is "24.5T"
// (T for thousand), which reads as "trillion" to most people.
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

// Full numbers keep Indian digit grouping, e.g. 1,00,000.
const plainFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** Human-readable number, e.g. 24500 -> "24,500". */
export const formatNumber = (value) =>
  Number.isFinite(value) ? plainFormatter.format(value) : '—';

/** Axis-friendly number, e.g. 24500 -> "24.5K". */
export const formatCompact = (value) =>
  Number.isFinite(value) ? compactFormatter.format(value) : '—';

export const formatValueWithUnit = (value, unit) => {
  const formatted = formatNumber(value);
  return unit ? `${formatted} ${unit}` : formatted;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Turns `extra:Region` into `Region` for display. */
export const stripExtraPrefix = (key) => key.replace(/^extra:/, '');

export const titleCase = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
