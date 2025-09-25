import { useEffect, useRef, useState } from 'react';
import { getDBSync, initOfflineDB } from '../offline/db';

/**
 * useOfflineInit
 * Pre-charges (warm-up) the offline IndexedDB (Dexie) early in the lifecycle so that
 * first user actions (like creating a task offline) are fast and do not pay dynamic import cost.
 *
 * Options:
 *  - enabled: boolean (default true) – gate by feature flag outside.
 *  - timeoutMs: abort warm-up if it takes too long (avoid hanging render) (default 2500ms).
 *  - prefetch: optional async callback to pre-cache initial domain data (projects, tasks, etc.).
 *
 * Returns: { ready, error, durationMs }
 */
export function useOfflineInit({ enabled = true, timeoutMs = 2500, prefetch } = {}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [durationMs, setDuration] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    const started = performance.now();

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      if (!cancelled && !ready) {
        console.warn('[offline-init] Timeout warm-up');
        setReady(true); // degrade gracefully – we keep shim
      }
    }, timeoutMs);

    (async () => {
      try {
        await initOfflineDB();
        if (prefetch) {
          try { await prefetch(getDBSync()); } catch (pfErr) { console.warn('[offline-init] prefetch error', pfErr); }
        }
        if (!cancelled) {
          setDuration(Math.round(performance.now() - started));
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setReady(true); // still mark ready (shim mode)
        }
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled, prefetch, timeoutMs, ready]);

  return { ready, error, durationMs };
}
