import { useCallback, useEffect, useState } from 'react';
import { getDBSync, initOfflineDB, queueOperation } from '../offline/db';

// useConflicts: reactive hook to read unresolved conflicts from Dexie.
// Polls periodically (default 5s) because we don't have Dexie live query plugin here.
export function useConflicts({ enabled = true, intervalMs = 5000 } = {}) {
    const [conflicts, setConflicts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isShim, setIsShim] = useState(false); // true si DB offline non initialisée (fallback no-op)

    const load = useCallback(async () => {
        if (!enabled) return;
        await initOfflineDB();
        const db = getDBSync();
        if (db._shim) {
            setIsShim(true);
            setConflicts([]);
            setLoading(false);
            return;
        } else if (isShim) {
            // DB maintenant disponible
            setIsShim(false);
        }
        try {
            const rows = await db.conflicts.toArray();
            // show unresolved first, newest first
            rows.sort((a, b) => (a.resolved === b.resolved ? b.createdAt - a.createdAt : a.resolved ? 1 : -1));
            setConflicts(rows);
        } catch (e) {
            console.warn('[conflicts] load error', e.message);
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) { setLoading(false); return; }
        load();
        const id = setInterval(load, intervalMs);
        return () => clearInterval(id);
    }, [enabled, load, intervalMs]);

    const markResolved = useCallback(async (id) => {
        await initOfflineDB();
        const db = getDBSync();
        if (db._shim) return;
        try {
            await db.conflicts.update(id, { resolved: true, resolvedAt: Date.now() });
            setConflicts(prev => prev.map(c => c.id === id ? { ...c, resolved: true, resolvedAt: Date.now() } : c));
        } catch (e) {
            console.warn('[conflicts] markResolved error', e.message);
        }
    }, []);

    const clearResolved = useCallback(async () => {
        await initOfflineDB();
        const db = getDBSync();
        if (db._shim) return;
        try {
            const resolved = await db.conflicts.where('resolved').equals(true).primaryKeys();
            if (resolved.length) await db.conflicts.bulkDelete(resolved);
            setConflicts(prev => prev.filter(c => !c.resolved));
        } catch (e) {
            console.warn('[conflicts] clearResolved error', e.message);
        }
    }, []);

    const purgeAll = useCallback(async () => {
        await initOfflineDB();
        const db = getDBSync();
        if (db._shim) return;
        try {
            const all = await db.conflicts.toCollection().primaryKeys();
            if (all.length) await db.conflicts.bulkDelete(all);
            setConflicts([]);
        } catch (e) {
            console.warn('[conflicts] purgeAll error', e.message);
        }
    }, []);

    const applyServer = useCallback(async (conflict) => {
        if (!conflict || !conflict.serverData) return;
        // Strategy: mark resolved & queue a client upsert with serverData to ensure local caches align.
        await queueOperation({
            entity: conflict.entity,
            action: 'upsert',
            data: conflict.serverData,
            entityId: conflict.entityId,
            version: conflict.serverVersion
        });
        await markResolved(conflict.id);
    }, [markResolved]);

    const replayClient = useCallback(async (conflict) => {
        if (!conflict || !conflict.originalData) return;
        // Requeue original client mutation with bumped (or stripped) version to attempt merge; version left undefined triggers create/overwrite semantics server-side where allowed.
        await queueOperation({
            entity: conflict.entity,
            action: 'upsert',
            data: conflict.originalData,
            entityId: conflict.entityId
        });
        await markResolved(conflict.id);
    }, [markResolved]);

    const manualMerge = useCallback(async (conflict, mergedData) => {
        if (!conflict || !mergedData) return;
        // Custom merge: upsert with user-provided mergedData, basing version on serverVersion to prevent immediate mismatch.
        await queueOperation({
            entity: conflict.entity,
            action: 'upsert',
            data: mergedData,
            entityId: conflict.entityId,
            version: conflict.serverVersion // base on server version to avoid immediate mismatch
        });
        await markResolved(conflict.id);
    }, [markResolved]);

    return { conflicts, loading, isShim, markResolved, clearResolved, purgeAll, applyServer, replayClient, manualMerge, refresh: load };
}
