import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for API calls with loading/error/data state management.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(() => pipelineApi.getAll());
 *   const { data, loading, error, refetch } = useApi(() => monitorApi.getByPipelineId(id), [id]);
 *
 * Returns:
 *   data     — the unwrapped response data (res.data), null while loading
 *   loading  — true while the request is in flight
 *   error    — error message string, null on success
 *   refetch  — call this to re-trigger the API call (e.g., on Refresh button click)
 */
export function useApi(apiFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFn();
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for mutations (POST/PUT/DELETE) — doesn't auto-fire.
 *
 * Usage:
 *   const { mutate, loading, error } = useMutation();
 *   const result = await mutate(() => pipelineApi.create(payload));
 */
export function useMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (apiFn) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFn();
      return response.data;
    } catch (err) {
      setError(err.message || 'Something went wrong');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
}