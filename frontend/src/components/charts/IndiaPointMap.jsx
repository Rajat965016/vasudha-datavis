import { useMemo } from 'react';
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';

import useIndiaGeoJson from '@/hooks/useIndiaGeoJson.js';
import { ErrorState, LoadingState } from '@/components/ui/States.jsx';
import { formatNumber, formatValueWithUnit, stripExtraPrefix } from '@/utils/format.js';

/** Roughly the bounding box of mainland India plus the island territories. */
const INDIA_BOUNDS = [
  [6.5, 67.5],
  [37.5, 97.5],
];

const OUTLINE_STYLE = {
  color: '#38bdf8',
  weight: 1,
  fillColor: '#f8fafc',
  fillOpacity: 0.35,
};

/** Fits the viewport to the data on first render, falling back to all of India. */
const FitToData = ({ points }) => {
  const map = useMap();

  useMemo(() => {
    if (points.length > 0) {
      const bounds = points.map((point) => [point.latitude, point.longitude]);
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 7 });
    } else {
      map.fitBounds(INDIA_BOUNDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points]);

  return null;
};

/** Marker radius scales with the value so magnitude is readable at a glance. */
const buildRadiusScale = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return () => 8;
  return (value) => 5 + ((value - min) / (max - min)) * 13;
};

const CATEGORY_COLOURS = [
  '#0d9488',
  '#f59e0b',
  '#0ea5e9',
  '#65a30d',
  '#8b5cf6',
  '#e11d48',
  '#0f172a',
];

/**
 * Plots latitude/longitude rows on an interactive India map.
 * Supports zoom, pan and a popup per point that lists every column present in
 * the source CSV — including any extra columns the uploader provided.
 */
const IndiaPointMap = ({ rows = [], unit = '', columns = [], height = 420 }) => {
  const { geoJson, error, isLoading } = useIndiaGeoJson();

  const points = useMemo(
    () =>
      rows.filter(
        (row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude),
      ),
    [rows],
  );

  const radiusFor = useMemo(
    () => buildRadiusScale(points.map((point) => point.value)),
    [points],
  );

  const colourByCategory = useMemo(() => {
    const categories = [...new Set(points.map((point) => point.category).filter(Boolean))];
    return new Map(categories.map((name, index) => [name, CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]]));
  }, [points]);

  const extraColumns = useMemo(
    () => columns.filter((column) => column.key.startsWith('extra:')),
    [columns],
  );

  if (isLoading) return <LoadingState label="Loading the India map…" />;
  if (error) return <ErrorState title="Map unavailable" message={error} />;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200" style={{ height }}>
        <MapContainer
          bounds={INDIA_BOUNDS}
          scrollWheelZoom
          className="h-full w-full"
          style={{ background: '#ffffff' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {geoJson && <GeoJSON data={geoJson} style={() => OUTLINE_STYLE} interactive={false} />}
          <FitToData points={points} />

          {points.map((point, index) => {
            const colour = colourByCategory.get(point.category) ?? '#0d9488';
            return (
              <CircleMarker
                key={`${point.latitude}-${point.longitude}-${index}`}
                center={[point.latitude, point.longitude]}
                radius={radiusFor(point.value)}
                pathOptions={{
                  color: '#ffffff',
                  weight: 1.5,
                  fillColor: colour,
                  fillOpacity: 0.85,
                }}
              >
                <Popup>
                  <div className="min-w-[180px] space-y-1 text-xs">
                    <p className="text-sm font-semibold text-slate-900">
                      {point.label || `Location ${index + 1}`}
                    </p>
                    <p className="text-slate-600">
                      Value: <b className="text-slate-900">{formatValueWithUnit(point.value, unit)}</b>
                    </p>
                    {point.category && (
                      <p className="text-slate-600">
                        Category: <b className="text-slate-900">{point.category}</b>
                      </p>
                    )}
                    <p className="text-slate-500">
                      {formatNumber(point.latitude)}°N, {formatNumber(point.longitude)}°E
                    </p>
                    {extraColumns.map((column) => (
                      <p key={column.key} className="text-slate-600">
                        {stripExtraPrefix(column.label)}:{' '}
                        <b className="text-slate-900">{point[column.key] ?? '—'}</b>
                      </p>
                    ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {colourByCategory.size > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
          {[...colourByCategory.entries()].map(([name, colour]) => (
            <li key={name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />
              {name}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        {points.length} location{points.length === 1 ? '' : 's'} plotted · scroll to zoom, drag to
        pan, click a point for details.
      </p>
    </div>
  );
};

export default IndiaPointMap;
