import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Loads a GET endpoint and exposes loading / error / reload.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path).then(
      (data) => setState({ data, error: null, loading: false }),
      (e) => setState({ data: null, error: e.message, loading: false })
    );
  }, [path]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}
