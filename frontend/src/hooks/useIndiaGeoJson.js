import { useEffect, useState } from 'react';

const GEOJSON_URL = import.meta.env.VITE_INDIA_GEOJSON_URL ?? '/data/india.geojson';

/**
 * The India state polygons are ~240 KB, so they are fetched once and shared by
 * every heatmap on the page through this module-level cache.
 */
let cachedPromise = null;

const loadIndiaGeoJson = () => {
  if (!cachedPromise) {
    cachedPromise = fetch(GEOJSON_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load the India map (HTTP ${response.status}).`);
        }
        return response.json();
      })
      .catch((error) => {
        cachedPromise = null; // allow a retry after a transient failure
        throw error;
      });
  }
  return cachedPromise;
};

const useIndiaGeoJson = () => {
  const [state, setState] = useState({ geoJson: null, error: null, isLoading: true });

  useEffect(() => {
    let cancelled = false;

    loadIndiaGeoJson()
      .then((geoJson) => {
        if (!cancelled) setState({ geoJson, error: null, isLoading: false });
      })
      .catch((error) => {
        if (!cancelled) setState({ geoJson: null, error: error.message, isLoading: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

export default useIndiaGeoJson;
