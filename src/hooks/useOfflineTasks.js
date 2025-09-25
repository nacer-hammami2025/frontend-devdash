import { useCallback, useEffect, useState } from 'react';
import { createTask as apiCreateTask, updateTask as apiUpdateTask, fetchTasksDelta } from '../api';
import { cacheTasks, getDBSync, getMeta, initOfflineDB, queueOperation, setMeta, updateLocalTask } from '../offline/db';

// Hook offline-first for tasks list
export function useOfflineTasks({ enabled = true, projectId } = {}) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deltaLoading, setDeltaLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastDelta, setLastDelta] = useState(null);
    const [stale, setStale] = useState(false);
    let debounceTimer = null; // ephemeral per render - we wrap in fn using closure

    const scheduleDelta = useCallback(() => {
        if (!enabled) return;
        setStale(true);
        // simple debounce: clear any existing timer reference stored on window
        const key = '__tasks_delta_timer';
        if (window[key]) clearTimeout(window[key]);
        window[key] = setTimeout(() => {
            fetchDelta();
        }, 600);
    }, [enabled]);

    const loadCache = useCallback(async () => {
        if (!enabled) { setLoading(false); return; }
        await initOfflineDB();
        const db = getDBSync();
        if (db._shim) { setLoading(false); return; }
        try {
            let col = db.tasks;
            if (projectId) {
                const all = await col.where('project').equals(projectId).toArray();
                setTasks(all);
            } else {
                const all = await col.toArray();
                setTasks(all);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [enabled, projectId]);

    const fetchDelta = useCallback(async () => {
        if (!enabled) return;
        setDeltaLoading(true);
        try {
            const since = await getMeta(projectId ? `lastTasksSync:${projectId}` : 'lastTasksSyncAll');
            const list = await fetchTasksDelta({ since, projectId });
            if (Array.isArray(list) && list.length) {
                await cacheTasks(list);
                await initOfflineDB();
                const db = getDBSync();
                let merged;
                if (projectId) {
                    const filtered = await db.tasks.where('project').equals(projectId).toArray();
                    merged = filtered;
                } else {
                    merged = await db.tasks.toArray();
                }
                setTasks(merged);
            }
            const nowIso = new Date().toISOString();
            await setMeta(projectId ? `lastTasksSync:${projectId}` : 'lastTasksSyncAll', nowIso);
            setLastDelta(nowIso);
            setStale(false);
        } catch (e) {
            setError(e.message);
        } finally {
            setDeltaLoading(false);
        }
    }, [enabled, projectId]);

    useEffect(() => { loadCache().then(fetchDelta); }, [loadCache, fetchDelta]);

    // Realtime event listeners
    useEffect(() => {
        if (!enabled) return;
        const taskHandler = (e) => {
            const evt = e.detail;
            if (!evt) return;
            if (evt.type === 'task.updated' || evt.type === 'task.created' || evt.type === 'task.deleted') {
                // Only schedule if relevant to current project filter
                if (!projectId || evt.project === projectId) scheduleDelta();
            }
        };
        window.addEventListener('realtime:task', taskHandler);
        return () => window.removeEventListener('realtime:task', taskHandler);
    }, [enabled, projectId, scheduleDelta]);

    // Optimistic create
    const createInline = useCallback(async ({ title, description }) => {
        const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const optimistic = { id: tmpId, title, description, project: projectId, status: 'todo', progress: 0, version: 0, updatedAt: new Date().toISOString() };
        setTasks(prev => [optimistic, ...prev]);
        try {
            if (!navigator.onLine) {
                await queueOperation({ entity: 'task', action: 'upsert', data: { ...optimistic }, entityId: tmpId });
                await cacheTasks([optimistic]);
                return { offline: true, id: tmpId };
            }
            const created = await apiCreateTask({ title, description, project: projectId });
            // Replace tmp with real if present
            setTasks(prev => prev.map(t => t.id === tmpId ? { ...t, id: created._id || created.id, _id: created._id || created.id, ...created } : t));
            await cacheTasks([created]);
            return created;
        } catch (e) {
            // Roll back optimistic on failure
            setTasks(prev => prev.filter(t => t.id !== tmpId));
            throw e;
        }
    }, [projectId]);

    // Optimistic update (patch)
    const updateInline = useCallback(async (id, patch) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
        let currentVersion;
        try {
            const db = getDBSync();
            if (db && !db._shim) {
                const existing = await db.tasks.get(id);
                currentVersion = existing?.version;
            }
        } catch { }
        try {
            if (!navigator.onLine) {
                await queueOperation({ entity: 'task', action: 'patch', data: { ...patch }, entityId: id, version: currentVersion });
                await updateLocalTask(id, patch);
                return { offline: true };
            }
            const updated = await apiUpdateTask(id, patch).catch(() => null);
            if (updated && (updated._id || updated.id)) {
                const withVersion = { id: updated._id || updated.id, version: updated.version, updatedAt: updated.updatedAt };
                setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch, ...withVersion } : t));
                await cacheTasks([updated]);
            }
            return { ok: true };
        } catch (e) {
            setError(e.message);
        }
    }, []);

    return { tasks, loading, deltaLoading, stale, error, refresh: fetchDelta, lastDelta, createInline, updateInline };
}

export default useOfflineTasks;
