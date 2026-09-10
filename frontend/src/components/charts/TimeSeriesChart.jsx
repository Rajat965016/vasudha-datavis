import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { CHART_VARIANTS } from '@/config/constants.js';
import { formatCompact, formatNumber } from '@/utils/format.js';

const ACCENT = '#f59e0b';
const SERIES_COLOURS = ['#047857', '#f59e0b', '#0ea5e9', '#8b5cf6', '#e11d48', '#0f766e'];

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-0.5 text-xs text-slate-600">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: <b className="text-slate-900">{formatNumber(entry.value)}</b>
          {unit ? ` ${unit}` : ''}
        </p>
      ))}
    </div>
  );
};

/**
 * Renders a time-series dataset as a line, bar or area chart.
 *
 * The shape is entirely data-driven: rows carry `period` and `value`, and an
 * optional `series` column automatically produces one plotted series per
 * distinct value — nothing here is specific to any particular dataset.
 */
const TimeSeriesChart = ({ rows = [], variant = CHART_VARIANTS.LINE, unit = '', height = 320 }) => {
  const { data, seriesKeys } = useMemo(() => {
    const hasSeriesColumn = rows.some((row) => row.series);

    if (!hasSeriesColumn) {
      return {
        data: rows.map((row) => ({ period: row.period, Value: row.value })),
        seriesKeys: ['Value'],
      };
    }

    // Pivot long-format rows into one object per period, one key per series.
    const byPeriod = new Map();
    const keys = new Set();

    rows.forEach((row) => {
      const key = row.series || 'Value';
      keys.add(key);
      const bucket = byPeriod.get(row.period) ?? { period: row.period };
      bucket[key] = row.value;
      byPeriod.set(row.period, bucket);
    });

    return { data: [...byPeriod.values()], seriesKeys: [...keys] };
  }, [rows]);

  const axisProps = {
    stroke: '#94a3b8',
    tick: { fontSize: 11, fill: '#64748b' },
    tickLine: false,
  };

  const colourFor = (index) => SERIES_COLOURS[index % SERIES_COLOURS.length];
  const showLegend = seriesKeys.length > 1;

  const shared = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis dataKey="period" {...axisProps} axisLine={{ stroke: '#e2e8f0' }} minTickGap={16} />
      <YAxis
        {...axisProps}
        axisLine={false}
        tickFormatter={formatCompact}
        // Wider gutter when a unit label is present, so it never overlaps ticks.
        width={unit ? 72 : 56}
        label={
          unit
            ? {
                value: unit,
                angle: -90,
                position: 'left',
                offset: -8,
                style: { fontSize: 11, fill: '#64748b', textAnchor: 'middle' },
              }
            : undefined
        }
      />
      <Tooltip content={<CustomTooltip unit={unit} />} />
      {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  );

  const margin = { top: 12, right: 16, bottom: 4, left: unit ? 8 : 0 };

  if (variant === CHART_VARIANTS.BAR) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={margin}>
          {shared}
          {seriesKeys.map((key, index) => (
            <Bar key={key} dataKey={key} fill={colourFor(index)} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (variant === CHART_VARIANTS.AREA) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={margin}>
          <defs>
            {seriesKeys.map((key, index) => (
              <linearGradient key={key} id={`area-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colourFor(index)} stopOpacity={0.45} />
                <stop offset="95%" stopColor={colourFor(index)} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>
          {shared}
          {seriesKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colourFor(index)}
              strokeWidth={2}
              fill={`url(#area-${key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        {shared}
        {seriesKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={seriesKeys.length === 1 ? ACCENT : colourFor(index)}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TimeSeriesChart;
