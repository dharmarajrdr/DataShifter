import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useEventSource — React hook for SSE (Server-Sent Events) subscriptions.
 *
 * Replaces usePolling with real-time push. Auto-connects on mount,
 * auto-reconnects on disconnect (with max retry limit and exponential backoff),
 * cleans up on unmount.
 *
 * @param {Object} options
 * @param {string[]} options.channels - channels to subscribe to
 * @param {boolean} [options.enabled=true] - toggle connection on/off
 * @param {number} [options.maxRetries=5] - max reconnection attempts before giving up
 * @param {number} [options.reconnectDelayMs=3000] - initial delay before reconnecting
 * @param {number} [options.maxReconnectDelayMs=30000] - max delay cap for exponential backoff
 * @param {Function} [options.onProgress] - called on PROGRESS events
 * @param {Function} [options.onStatusChange] - called on STATUS_CHANGE events
 * @param {Function} [options.onError] - called on ERROR events
 * @param {Function} [options.onConnected] - called when SSE connection is established
 * @param {Function} [options.onMaxRetriesReached] - called when all retries exhausted
 * @param {Function} [options.onAny] - called on ANY event (for logging/debugging)
 *
 * @returns {Object}
 *   connected        - whether SSE is currently open
 *   lastEvent        - most recent event received
 *   reconnectCount   - current retry attempt number
 *   exhausted        - true if maxRetries reached (stopped retrying)
 *   disconnect()     - manually close connection
 *   retry()          - manually retry after exhausted (resets counter)
 *
 * @example
 *   const { connected, exhausted, retry } = useEventSource({
 *     channels: ['pipeline:p-001'],
 *     maxRetries: 5,
 *     onProgress: (data) => setProgress(data.payload.overallProgress),
 *     onStatusChange: (data) => setStatus(data.payload.newStatus),
 *     onError: (data) => addError(data.payload),
 *     onMaxRetriesReached: () => toast.error('Lost connection to server'),
 *   });
 *
 *   // Show retry button when exhausted
 *   {exhausted && <button onClick={retry}>Reconnect</button>}
 */
export function useEventSource({
  channels = [],
  enabled = true,
  maxRetries = 5,
  reconnectDelayMs = 3000,
  maxReconnectDelayMs = 30000,
  onProgress,
  onStatusChange,
  onError,
  onConnected,
  onMaxRetriesReached,
  onAny,
}) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  const sourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const retriesRef = useRef(0);

  /**
   * Calculate delay with exponential backoff.
   * attempt 0 → 3s, attempt 1 → 6s, attempt 2 → 12s, capped at maxReconnectDelayMs
   */
  const getBackoffDelay = useCallback((attempt) => {
    const delay = reconnectDelayMs * Math.pow(2, attempt);
    return Math.min(delay, maxReconnectDelayMs);
  }, [reconnectDelayMs, maxReconnectDelayMs]);

  const connect = useCallback(() => {
    if (!enabled || channels.length === 0) return;
    if (exhausted) return;

    const token = localStorage.getItem('ds_access_token');
    if (!token) return;

    const channelParam = channels.join(',');
    const url = `${process.env.REACT_APP_API_BASE || 'http://localhost:8080/api/v1'}/stream?channels=${encodeURIComponent(channelParam)}&token=${encodeURIComponent(token)}`;

    const source = new EventSource(url);
    sourceRef.current = source;

    // --- Connection established ---
    source.addEventListener('CONNECTED', (e) => {
      if (!mountedRef.current) return;
      setConnected(true);
      setReconnectCount(0);
      setExhausted(false);
      retriesRef.current = 0; // Reset retry counter on successful connection
      const data = JSON.parse(e.data);
      if (onConnected) onConnected(data);
    });

    // --- PROGRESS events ---
    source.addEventListener('PROGRESS', (e) => {
      if (!mountedRef.current) return;
      const data = JSON.parse(e.data);
      setLastEvent(data);
      if (onProgress) onProgress(data);
      if (onAny) onAny('PROGRESS', data);
    });

    // --- STATUS_CHANGE events ---
    source.addEventListener('STATUS_CHANGE', (e) => {
      if (!mountedRef.current) return;
      const data = JSON.parse(e.data);
      setLastEvent(data);
      if (onStatusChange) onStatusChange(data);
      if (onAny) onAny('STATUS_CHANGE', data);
    });

    // --- ERROR events (pipeline errors, not connection errors) ---
    source.addEventListener('ERROR', (e) => {
      if (!mountedRef.current) return;
      const data = JSON.parse(e.data);
      setLastEvent(data);
      if (onError) onError(data);
      if (onAny) onAny('ERROR', data);
    });

    // --- Connection error (network issue, server down) ---
    source.onerror = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      source.close();
      sourceRef.current = null;

      const currentAttempt = retriesRef.current;

      // Check if max retries exceeded
      if (currentAttempt >= maxRetries) {
        setExhausted(true);
        setReconnectCount(currentAttempt);
        if (onMaxRetriesReached) onMaxRetriesReached();
        return; // Stop retrying
      }

      // Schedule reconnect with exponential backoff
      const delay = getBackoffDelay(currentAttempt);
      retriesRef.current = currentAttempt + 1;
      setReconnectCount(currentAttempt + 1);

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current && !exhausted) {
          connect();
        }
      }, delay);
    };
  }, [channels.join(','), enabled, maxRetries, exhausted, getBackoffDelay]);

  // Connect on mount / channel change
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  // Disconnect helper
  const disconnect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    setConnected(false);
  }, []);

  // Manual retry — resets counter and reconnects (use after exhausted)
  const retry = useCallback(() => {
    retriesRef.current = 0;
    setReconnectCount(0);
    setExhausted(false);
    // Small delay to allow state to settle before connect reads exhausted=false
    setTimeout(() => connect(), 100);
  }, [connect]);

  return {
    /** Whether the SSE connection is currently open */
    connected,
    /** The most recent event received (any type) */
    lastEvent,
    /** Number of reconnection attempts since last successful connection */
    reconnectCount,
    /** True if maxRetries reached — stopped retrying automatically */
    exhausted,
    /** Manually disconnect the SSE connection */
    disconnect,
    /** Manually retry after exhausted — resets counter and reconnects */
    retry,
  };
}