import { useMemo, useRef } from 'react';
import { GeoJSON, MapContainer } from 'react-leaflet';

import useIndiaGeoJson from '@/hooks/useIndiaGeoJson.js';
import { ErrorState, LoadingState } from '@/components/ui/States.jsx';
import { formatCompact, formatValueWithUnit } from '@/utils/format.js';

const INDIA_BOUNDS = [
  [6.5, 67.5],
  [37.5, 97.5],
];

/** Sequential amber ramp, matching the reference heatmap in the brief. */
const RAMP = ['#fff7e6', '#fee9b8', '#fdd689', '#fcbf59', '#f59e0b', '#d97706', '#b45309'];

const NO_DATA_STYLE = {
  fillColor: '#f8fafc',
  fillOpacity: 1,
  color: '#cbd5e1',
  weight: 0.8,
};

/** Same normalisation the backend uses, so lookups always line up. */
const normaliseKey = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');

/**
 * India state-level choropleth.
 *
 * States present in the dataset are shaded along a sequential ramp; states with
 * no data stay neutral so the difference is unambiguous. Hovering highlights a
 * state and shows its value.
 */
const IndiaStateHeatmap = ({ rows = [], unit = '', height = 460 }) => {
  const { geoJson, error, isLoading } = useIndiaGeoJson();
  const geoJsonRef = useRef(null);

  const { valueByState, min, max } = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      if (Number.isFinite(row.value)) map.set(normaliseKey(row.state), row.value);
    });
    const values = [...map.values()];
    return {
      valueByState: map,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    };
  }, [rows]);

  const colourFor = useMemo(() => {
    if (max === min) return () => RAMP[RAMP.length - 3];
    return (value) => {
      const ratio = (value - min) / (max - min);
      const index = Math.min(RAMP.length - 1, Math.floor(ratio * RAMP.length));
      return RAMP[index];
    };
  }, [min, max]);

  const styleFor = (feature) => {
    const value = valueByState.get(normaliseKey(feature.properties?.ST_NM));
    if (!Number.isFinite(value)) return NO_DATA_STYLE;
    return {
      fillColor: colourFor(value),
      fillOpacity: 0.92,
      color: '#94a3b8',
      weight: 0.8,
    };
  };

  /** Binds hover highlighting and a tooltip to each state polygon. */
  const onEachFeature = (feature, layer) => {
    const name = feature.properties?.ST_NM ?? 'Unknown';
    const value = valueByState.get(normaliseKey(name));

    layer.bindTooltip(
      `<strong>${name}</strong><br/>${
        Number.isFinite(value) ? formatValueWithUnit(value, unit) : 'No data'
      }`,
      { sticky: true, direction: 'auto', className: 'heatmap-tooltip' },
    );

    layer.on({
      mouseover: (event) => {
        event.target.setStyle({ weight: 2, color: '#0f172a', fillOpacity: 1 });
        event.target.bringToFront();
      },
      mouseout: (event) => {
        geoJsonRef.current?.resetStyle(event.target);
      },
    });
  };

  if (isLoading) return <LoadingState label="Loading the India map…" />;
  if (error) return <ErrorState title="Map unavailable" message={error} />;

  const legendStops = RAMP.map((colour, index) => ({
    colour,
    from: min + ((max - min) * index) / RAMP.length,
  }));

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200" style={{ height }}>
        <MapContainer
          bounds={INDIA_BOUNDS}
          scrollWheelZoom
          zoomControl
          attributionControl={false}
          className="h-full w-full"
          style={{ background: '#ffffff' }}
        >
          {geoJson && (
            <GeoJSON
              ref={geoJsonRef}
              // Re-keying forces a restyle when the underlying values change.
              key={`${min}-${max}-${valueByState.size}`}
              data={geoJson}
              style={styleFor}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{formatCompact(min)}</span>
          <div className="flex overflow-hidden rounded" role="img" aria-label="Value scale">
            {legendStops.map((stop) => (
              <span
                key={stop.colour}
                className="h-3 w-7"
                style={{ backgroundColor: stop.colour }}
                title={formatCompact(stop.from)}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {formatCompact(max)} {unit}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-3 w-4 rounded border border-slate-300 bg-slate-50" />
          No data
        </span>
      </div>

      <p className="text-xs text-slate-500">
        {valueByState.size} state{valueByState.size === 1 ? '' : 's'} with data · hover a state to
        see its value.
      </p>
    </div>
  );
};

export default IndiaStateHeatmap;
