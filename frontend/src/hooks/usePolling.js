import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePolling — auto-refresh data at a configurable interval.
 *
 * Usage:
 *   const { data, loading, lastUpdated, refresh, interval, setInterval } = usePolling(
 *     () => monitorApi.getByPipelineId(id),
 *     { defaultInterval: 5000, stopWhen: (data) => data?.status !== 'RUNNING' }
 *   );
 *
 * Features:
 *   - Configurable interval (0 = off)
 *   - Auto-stops polling when stopWhen returns true
 *   - Tracks lastUpdated timestamp
 *   - Manual refresh() trigger
 *   - Cleans up on unmount
 *   - Skips overlapping requests (won't fire if previous request still in flight)
 */
export function usePolling(apiFn, options = {}) {
  const {
    defaultInterval = 5000,    // ms, 0 = polling off
    stopWhen = () => false,    // (data) => boolean — stop polling when true
    deps = [],                 // additional dependencies to re-init
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [interval, setIntervalVal] = useState(defaultInterval);
  const [refreshCount, setRefreshCount] = useState(0);
  const inFlight = useRef(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (isManual = false) => {
    if (inFlight.current) return; // skip if previous request still running
    inFlight.current = true;
    if (isManual) setLoading(true);

    try {
      const response = await apiFn();
      if (!mountedRef.current) return;
      setData(response.data);
      setLastUpdated(new Date());
      setRefreshCount(prev => prev + 1);
    } catch (err) {
      // Don't clear data on poll error — keep showing last good data
      console.warn('Polling error:', err.message);
    } finally {
      inFlight.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, deps);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchData(true);
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  // Polling timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (interval > 0 && data && !stopWhen(data)) {
      timerRef.current = setInterval(() => {
        fetchData(false);
      }, interval);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval, data, fetchData, stopWhen]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    lastUpdated,
    refreshCount,
    interval,
    setInterval: setIntervalVal,
    refresh,
    isPolling: interval > 0 && data && !stopWhen(data),
  };
}