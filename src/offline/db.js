// Offline DB module (Dexie) with conservative lazy initializer.
// Feature flag: VITE_OFFLINE_SYNC=1 enables real IndexedDB usage; otherwise a no-op shim is used.
const OFFLINE_ENABLED = import.meta?.env?.VITE_OFFLINE_SYNC === '1' || import.meta?.env?.VITE_OFFLINE_SYNC === 'true';

const shimDB = {
  _shim: true,
  projects: { bulkPut: async () => { } },
  tasks: { bulkPut: async () => { } },
  outbox: { add: async () => { }, orderBy: () => ({ limit: () => ({ toArray: async () => [] }) }), bulkDelete: async () => { } },
  conflicts: { add: async () => { } },
  meta: { put: async () => { }, get: async () => null },
  version: () => ({ stores: () => { } })
};

let db = shimDB;
let _initPromise = null;
async function ensureDB() {
  if (db && !db._shim) return db;
  if (!OFFLINE_ENABLED) return shimDB;
  if (_initPromise) return _initPromise;
  _initPromise = import('dexie')
    .then(mod => {
      const Dexie = mod.default || mod.Dexie || mod;
      const real = new Dexie('DevDashOffline');
      real.version(1).stores({
        projects: 'id, version, updatedAt, status',
        tasks: 'id, project, version, updatedAt, status',
        outbox: '++id, createdAt, entity, op, entityId, clientId',
        conflicts: '++id, entity, entityId, resolved, createdAt',
        meta: 'key'
      });
      db = real;
      return real;
    })
    .catch(e => {
      console.warn('[offline] Initialisation Dexie échouée – fallback shim', e);
      db = shimDB;
      return db;
    });
  return _initPromise;
}

export async function initOfflineDB() { return ensureDB(); }
export function getDBSync() { return db; }

// Tables:
// projects: offline cache of projects { id, name, description, status, progress, deadline, owner, version, updatedAt }
// tasks: offline cache of tasks { id, title, description, project, assignee, status, progress, version, updatedAt }
// outbox: queued mutations { id (auto), entity, op, data, entityId, version, clientId, createdAt }
// conflicts: conflict records { id (auto), entity, entityId, clientId, reason, serverVersion, clientVersion, serverData?, clientData?, originalData?, resolved, createdAt }
// meta: key-value for lastSync, etc { key, value }

// (Schema initialization now happens inside ensureDB)

export async function cacheProjects(projects) {
  if (!Array.isArray(projects)) return;
  const d = await ensureDB();
  if (d._shim) return;
  await d.projects.bulkPut(projects.map(p => ({
    id: p._id || p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    progress: p.progress,
    deadline: p.deadline,
    owner: p.owner,
    version: p.version ?? 0,
    updatedAt: p.updatedAt || new Date().toISOString()
  })));
}

export async function cacheTasks(tasks) {
  if (!Array.isArray(tasks)) return;
  const d = await ensureDB();
  if (d._shim) return;
  await d.tasks.bulkPut(tasks.map(t => ({
    id: t._id || t.id,
    title: t.title,
    description: t.description,
    project: t.project?._id || t.project,
    assignee: t.assignee?._id || t.assignee,
    status: t.status,
    progress: t.progress,
    version: t.version ?? 0,
    updatedAt: t.updatedAt || new Date().toISOString()
  })));
}

// Remove a locally cached task by id (used after server assigns real id)
export async function deleteLocalTask(id) {
  if (!id) return;
  const d = await ensureDB();
  if (d._shim) return;
  try { await d.tasks.delete(id); } catch { }
}

// Update a locally cached task (partial patch)
export async function updateLocalTask(id, patch) {
  if (!id || !patch) return;
  const d = await ensureDB();
  if (d._shim) return;
  try { await d.tasks.update(id, { ...patch, updatedAt: new Date().toISOString() }); } catch { }
}

export async function queueOperation(op) {
  // op: { entity, action, data, entityId, version }
  const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const d = await ensureDB();
  if (d._shim) return clientId;
  await d.outbox.add({
    entity: op.entity,
    op: op.action,
    data: op.data || null,
    entityId: op.entityId || (op.data && (op.data.id || op.data._id)) || null,
    version: op.version,
    clientId,
    createdAt: Date.now()
  });
  // Try to register a background sync (best-effort)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg.sync) {
        await reg.sync.register('devdash-outbox-sync');
      } else {
        // Fallback: send a message so client pages can trigger immediate flush
        reg.active?.postMessage({ type: 'OUTBOX_SYNC_REQUEST' });
      }
    } catch (e) {
      // Silent fail; background sync not critical
    }
  }
  return clientId;
}

export async function recordConflict(c) {
  const d = await ensureDB();
  if (d._shim) return;
  await d.conflicts.add({
    entity: c.entity,
    entityId: c.entityId,
    clientId: c.clientId,
    reason: c.reason,
    serverVersion: c.serverVersion,
    clientVersion: c.clientVersion,
    serverData: c.serverData || null,
    clientData: c.clientData || null,
    originalData: c.originalData || null,
    resolved: false,
    createdAt: Date.now()
  });
}

export async function getOutboxBatch(limit = 25) {
  const d = await ensureDB();
  if (d._shim) return [];
  return d.outbox.orderBy('createdAt').limit(limit).toArray();
}

export async function removeOutboxItems(ids) {
  const d = await ensureDB();
  if (d._shim) return;
  await d.outbox.bulkDelete(ids);
}

export async function setMeta(key, value) {
  const d = await ensureDB();
  if (d._shim) return;
  await d.meta.put({ key, value });
}

export async function getMeta(key) {
  const d = await ensureDB();
  if (d._shim) return null;
  return (await d.meta.get(key))?.value;
}
