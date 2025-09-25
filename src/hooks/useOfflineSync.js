import { useCallback, useEffect, useRef, useState } from 'react';
import { syncBatch } from '../api';
import { getDBSync, getMeta, getOutboxBatch, recordConflict, removeOutboxItems, setMeta } from '../offline/db';

// Hook that manages periodic flushing of the outbox when online with exponential backoff on failures
export function useOfflineSync({ enabled = true, intervalMs = 8000, maxIntervalMs = 5 * 60_000 } = {}) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [failureCount, setFailureCount] = useState(0);
  const [nextAttemptAt, setNextAttemptAt] = useState(null); // ISO string
  const [backoffMs, setBackoffMs] = useState(0);
  const timerRef = useRef(null);
  const tickRef = useRef(null);

  const computeBackoff = useCallback((fails) => {
    if (fails <= 0) return 0;
    // Exponential backoff with jitter: base 4s * 2^(fails-1), cap at maxIntervalMs
    const base = 4000 * Math.pow(2, fails - 1);
    const capped = Math.min(base, maxIntervalMs);
    const jitter = Math.round(capped * (0.15 * Math.random()));
    return capped + jitter;
  }, [maxIntervalMs]);

  const scheduleNext = useCallback(async (fails) => {
    const ms = computeBackoff(fails);
    const ts = Date.now() + ms;
    setBackoffMs(ms);
    setNextAttemptAt(new Date(ts).toISOString());
    await setMeta('syncFailureCount', fails);
    await setMeta('syncNextAttemptAt', ts);
  }, [computeBackoff]);

  const resetBackoff = useCallback(async () => {
    setFailureCount(0);
    setBackoffMs(0);
    setNextAttemptAt(null);
    await setMeta('syncFailureCount', 0);
    await setMeta('syncNextAttemptAt', null);
  }, []);

  const flush = useCallback(async () => {
    if (!enabled) return;
    if (!navigator.onLine) return; // Only flush when online
    if (syncing) return;

    // Respect backoff window
    if (failureCount > 0 && nextAttemptAt) {
      const due = new Date(nextAttemptAt).getTime();
      if (Date.now() < due) {
        return; // still backing off
      }
    }

    setSyncing(true);
    try {
      const batch = await getOutboxBatch(50);
      if (!batch.length) {
        await resetBackoff(); // success path if empty
        setSyncing(false);
        return;
      }

      const operations = batch.map(item => ({
        entity: item.entity,
        op: item.op,
        data: item.data,
        id: item.entityId,
        version: item.version,
        clientId: item.clientId
      }));

      const result = await syncBatch(operations);
      const appliedIds = [];

      if (result?.applied) {
        const db = getDBSync();
        for (const a of result.applied) {
          const original = batch.find(b => b.clientId === a.clientId);
          if (original) appliedIds.push(original.id);
          if (db && !db._shim) {
            if (a.entity === 'project') {
              try { await db.projects.update(a.id, { version: a.version }); } catch { }
            } else if (a.entity === 'task') {
              try { await db.tasks.update(a.id, { version: a.version }); } catch { }
            }
          }
        }
      }

      if (result?.conflicts) {
        const newConflicts = [];
        for (const c of result.conflicts) {
          const original = batch.find(b => b.clientId === c.clientId);
          if (original) appliedIds.push(original.id); // remove from outbox
          await recordConflict({
            entity: c.entity,
            entityId: c.id,
            clientId: c.clientId,
            reason: c.reason,
            serverVersion: c.server?.version,
            clientVersion: c.client?.version,
            serverData: c.server || null,
            clientData: c.client || null,
            originalData: original?.data || null
          });
          newConflicts.push(c);
        }
        if (newConflicts.length) setConflicts(prev => [...prev, ...newConflicts]);
      }

      if (appliedIds.length) await removeOutboxItems(appliedIds);

      setLastSync(new Date().toISOString());
      await setMeta('lastSync', new Date().toISOString());
      await resetBackoff();
    } catch (e) {
      console.warn('[offline-sync] flush error', e.message);
      const newFails = failureCount + 1;
      setFailureCount(newFails);
      await scheduleNext(newFails);
    } finally {
      setSyncing(false);
    }
  }, [enabled, syncing, failureCount, nextAttemptAt, resetBackoff, scheduleNext]);

  // Periodic base timer (tick every intervalMs to attempt flush respecting backoff)
  useEffect(() => {
    if (!enabled) return;
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      flush();
    }, intervalMs);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [enabled, intervalMs, flush]);

  // Fine-grained tick to auto-attempt right after backoff expires
  useEffect(() => {
    if (!enabled) return;
    tickRef.current && clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      if (failureCount > 0 && nextAttemptAt) {
        const due = new Date(nextAttemptAt).getTime();
        if (Date.now() >= due && navigator.onLine) {
          flush();
        }
      }
    }, 1000);
    return () => tickRef.current && clearInterval(tickRef.current);
  }, [enabled, failureCount, nextAttemptAt, flush]);

  // Online event triggers immediate flush & resets timer
  useEffect(() => {
    if (!enabled) return;
    const handler = () => setTimeout(() => flush(), 300);
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [enabled, flush]);

  // Listen for service worker background sync trigger
  useEffect(() => {
    if (!enabled) return;
    const swHandler = (event) => {
      if (event.data?.type === 'OFFLINE_OUTBOX_FLUSH') {
        flush();
      }
    };
    if (navigator?.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', swHandler);
    }
    return () => navigator?.serviceWorker?.removeEventListener('message', swHandler);
  }, [enabled, flush]);

  // Initial load: hydrate state
  useEffect(() => {
    (async () => {
      const ls = await getMeta('lastSync');
      if (ls) setLastSync(ls);
      const fc = await getMeta('syncFailureCount');
      if (typeof fc === 'number' && fc > 0) setFailureCount(fc);
      const nextTs = await getMeta('syncNextAttemptAt');
      if (nextTs) {
        const iso = new Date(nextTs).toISOString();
        setNextAttemptAt(iso);
        const remaining = new Date(nextTs).getTime() - Date.now();
        if (remaining > 0) setBackoffMs(remaining);
      }
    })();
  }, []);

  return { flush, syncing, lastSync, conflicts, failureCount, nextAttemptAt, backoffMs };
}
