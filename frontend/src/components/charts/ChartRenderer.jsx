import { lazy, Suspense } from 'react';

import { CHART_TYPES } from '@/config/constants.js';
import { LoadingState } from '@/components/ui/States.jsx';

// Maps pull in Leaflet, so they are only downloaded when a map is actually shown.
const IndiaPointMap = lazy(() => import('./IndiaPointMap.jsx'));
const IndiaStateHeatmap = lazy(() => import('./IndiaStateHeatmap.jsx'));
const TimeSeriesChart = lazy(() => import('./TimeSeriesChart.jsx'));

/**
 * Single entry point for rendering any dataset.
 *
 * The dataset carries its own visualisation configuration (`chartType`,
 * `chartVariant`, `columns`, `rows`), so this component simply dispatches on
 * that configuration. Supporting a new visualisation means registering it in
 * this map plus adding its schema on the backend — no page needs to change.
 */
const RENDERERS = {
  [CHART_TYPES.MAP_POINTS]: ({ dataset, height }) => (
    <IndiaPointMap
      rows={dataset.rows}
      columns={dataset.columns}
      unit={dataset.valueUnit}
      height={height}
    />
  ),
  [CHART_TYPES.STATE_HEATMAP]: ({ dataset, height }) => (
    <IndiaStateHeatmap rows={dataset.rows} unit={dataset.valueUnit} height={height} />
  ),
  [CHART_TYPES.TIME_SERIES]: ({ dataset, height }) => (
    <TimeSeriesChart
      rows={dataset.rows}
      variant={dataset.chartVariant}
      unit={dataset.valueUnit}
      height={height}
    />
  ),
};

const ChartRenderer = ({ dataset, height }) => {
  if (!dataset) return null;

  const render = RENDERERS[dataset.chartType];

  if (!render) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
        No renderer is registered for chart type “{dataset.chartType}”.
      </div>
    );
  }

  if (!dataset.rows?.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        This dataset has no rows to display.
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingState label="Preparing visualisation…" />}>
      {render({ dataset, height })}
    </Suspense>
  );
};

export default ChartRenderer;
