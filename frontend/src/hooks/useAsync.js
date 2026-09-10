import { useCallback, useEffect, useRef, useState } from 'react';

import { toApiError } from '@/api/client.js';

/**
 * Runs an async loader and exposes `{ data, error, isLoading, reload }`.
 * Results from a stale run are discarded, so fast navigation cannot render
 * data belonging to a previous route.
 *
 * @param {() => Promise<any>} loader
 * @param {any[]} deps Dependencies that should trigger a reload.
 */
const useAsync = (loader, deps = []) => {
  const [state, setState] = useState({ data: null, error: null, isLoading: true });
  const runId = useRef(0);

  const run = useCallback(() => {
    runId.current += 1;
    const currentRun = runId.current;

    setState((previous) => ({ ...previous, isLoading: true, error: null }));

    return loader()
      .then((data) => {
        if (runId.current === currentRun) setState({ data, error: null, isLoading: false });
        return data;
      })
      .catch((error) => {
        if (runId.current === currentRun) {
          setState({ data: null, error: toApiError(error), isLoading: false });
        }
        return null;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
};

export default useAsync;
