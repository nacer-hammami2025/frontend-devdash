import axios from 'axios';
// Offline helpers will be conditionally imported to avoid bundling Dexie in environments that do not need it

// Détection si l'accès se fait via adresse IP directe pour choisir l'URL d'API appropriée
function isIPAddress(host) {
  // Regex simple pour détecter une adresse IP
  return /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
}

// Use Vite proxy by default in dev to avoid CORS; allow override via VITE_API_URL
let API_URL = import.meta?.env?.VITE_API_URL || '/api';

// Simplification: on ne scanne plus les ports; on exige VITE_API_URL explicite si accès IP direct
const host = window.location.host;
const isIP = isIPAddress(host);
if (isIP) {
  const ip = host.split(':')[0];
  // Si VITE_API_URL fourni (ex: http://192.168.162.31:4000) on l'utilise tel quel.
  // Sinon on suppose backend sur 4000 (cohérent avec config) et on log un avertissement unique.
  if (API_URL === '/api') {
    const assumed = `http://${ip}:4000`;
    console.warn('[API Bootstrap] Mode IP détecté mais VITE_API_URL non défini. Hypothèse backend:', assumed);
    API_URL = assumed;
  }
}
console.log('API URL configured as (final):', API_URL);

// Fonction pour normaliser les chemins d'API et éviter la duplication du préfixe /api
function normalizePath(path) {
  // Pour les chemins commençant par /api dans le code client
  if (path.startsWith('/api/')) {
    // Si l'URL de base contient déjà /api, on retire le préfixe du chemin
    if (API_URL.endsWith('/api')) {
      const normalizedPath = path.replace(/^\/api/, '');
      console.log(`Removing duplicate /api prefix: ${path} -> ${normalizedPath}`);
      return normalizedPath;
    }
  } else {
    // Si l'URL de base ne contient pas /api et que le chemin n'en a pas non plus,
    // on ajoute /api pour les chemins relatifs en mode IP
    if (!API_URL.endsWith('/api') && isIP) {
      const normalizedPath = `/api${path}`;
      console.log(`Adding /api prefix for IP mode: ${path} -> ${normalizedPath}`);
      return normalizedPath;
    }
  }
  return path;
}

const API = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Override the request methods to automatically normalize paths
const originalGet = API.get;
const originalPost = API.post;
const originalPut = API.put;
const originalPatch = API.patch;
const originalDelete = API.delete;

API.get = function (url, config) {
  return originalGet.call(this, normalizePath(url), config);
};

API.post = function (url, data, config) {
  return originalPost.call(this, normalizePath(url), data, config);
};

API.put = function (url, data, config) {
  return originalPut.call(this, normalizePath(url), data, config);
};

API.patch = function (url, data, config) {
  return originalPatch.call(this, normalizePath(url), data, config);
};

API.delete = function (url, config) {
  return originalDelete.call(this, normalizePath(url), config);
};

// Log configuration
console.log('API client configured with baseURL:', API.defaults.baseURL);

// Session management & redirect throttle
let refreshPromise = null;
let lastRedirectAt = 0;
let redirectLock = false;
const redirectThrottleMs = 400; // minimal spacing
const redirectLockMs = 2000; // hard lock to prevent history spam storms
const safeRedirect = (target) => {
  try {
    const now = Date.now();
    if (typeof window === 'undefined') return;
    if (!target) return;
    if (window.location.pathname === target) return; // already there
    if (redirectLock) return; // active lock
    if (now - lastRedirectAt < redirectThrottleMs) return; // soft throttle
    redirectLock = true;
    lastRedirectAt = now;
    // Use replace to avoid building up history entries
    window.location.replace(target);
    setTimeout(() => { redirectLock = false; }, redirectLockMs);
  } catch (e) {
    // Fallback if replace fails for some reason
    try { window.location.href = target; } catch { }
  }
};
const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('tempToken');
  localStorage.removeItem('user');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('sessionExpiry');
};

const updateSession = (token, user, sessionId, expiresAt) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('sessionId', sessionId);
  localStorage.setItem('sessionExpiry', expiresAt);
};

// Request interceptor
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  const tempToken = localStorage.getItem('tempToken');
  const sessionId = localStorage.getItem('sessionId');

  // Normalize path for checks (config.url may be relative)
  const urlPath = (() => {
    try {
      const u = new URL(config.url, 'http://local');
      return u.pathname || '';
    } catch {
      return config.url || '';
    }
  })();
  // Remove duplicate /api prefix if present
  const cleanPath = urlPath.replace(/\/api\/api\//, '/api/');
  const isAuthBootstrap = cleanPath.includes('/auth/login') || cleanPath.includes('/auth/register') || cleanPath.includes('/auth/verify-2fa');

  console.log('📤 Request Config:', {
    url: config.url,
    method: config.method,
    hasToken: !!token,
    hasTempToken: !!tempToken,
    hasSessionId: !!sessionId
  });

  // Avoid sending any auth/session headers during auth bootstrap calls
  if (!isAuthBootstrap) {
    // Prefer full session token; fall back to tempToken during 2FA setup/verification
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (tempToken) {
      config.headers.Authorization = `Bearer ${tempToken}`;
    }

    if (sessionId && token) {
      // Only attach session ID for fully authenticated requests
      config.headers['X-Session-Id'] = sessionId;
    }
  }

  // Check session expiry (only relevant for full sessions)
  const sessionExpiry = localStorage.getItem('sessionExpiry');
  if (!isAuthBootstrap && token && sessionExpiry && new Date(sessionExpiry) < new Date()) {
    console.log('❌ Session expired, redirecting to login');
    clearSession();
    if (window.location.pathname !== '/login') safeRedirect('/login?expired=true');
    return Promise.reject(new Error('Session expired'));
  }

  return config;
}, error => {
  console.error('Request error:', error);
  return Promise.reject(error);
});

// Response interceptor
API.interceptors.response.use(
  response => {
    // Normalize payload shape (our backend wraps in { success, data })
    const payload = response?.data?.data ?? response?.data;

    console.log('📥 Réponse reçue:', {
      url: response.config.url,
      status: response.status,
      hasSessionData: !!payload?.session || !!payload?.expiresAt
    });

    // Update session expiry if provided either directly or under a session object
    const expiresAt = payload?.session?.expiresAt || payload?.expiresAt;
    if (expiresAt) {
      localStorage.setItem('sessionExpiry', expiresAt);
      console.log('⏰ Session expiry mise à jour:', expiresAt);
    }

    // Capture server-provided session id header on auth endpoints
    const headerSessionId = response.headers?.['x-session-id'] || response.headers?.['X-Session-Id'];
    if (headerSessionId && !localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', headerSessionId);
      console.log('🆔 Session ID fixé depuis l’en-tête:', headerSessionId);
    }

    return response;
  },
  async error => {
    console.error('❌ Erreur de réponse:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message
    });

    // --- Détection de conflit (409) pour enregistrement offline ---
    if (error.response?.status === 409 && error.config) {
      try {
        // Import dynamique pour ne pas charger Dexie si non activé
        const { recordConflict, initOfflineDB, getDBSync } = await import('./offline/db.js');
        await initOfflineDB();
        const odb = getDBSync();
        if (!odb._shim) {
          // Heuristique: tenter d'extraire métadonnées de la réponse
          const serverData = error.response.data?.server || error.response.data?.serverData;
          const clientData = error.response.data?.client || error.response.data?.clientData;
          const reason = error.response.data?.reason || error.response.data?.message || 'version_mismatch';
          const entity = (() => {
            const u = (error.config.url || '').toLowerCase();
            if (u.includes('/tasks')) return 'task';
            if (u.includes('/projects')) return 'project';
            return 'unknown';
          })();
          const entityId = (() => {
            const match = (error.config.url || '').match(/\/(projects|tasks)\/([^/?#]+)/i);
            return match ? match[2] : undefined;
          })();
          const clientVersion = error.config.headers?.['X-Entity-Version'] || undefined;
          const serverVersion = error.response.data?.serverVersion || undefined;
          await recordConflict({
            entity,
            entityId,
            clientId: undefined,
            reason,
            serverVersion,
            clientVersion,
            serverData,
            clientData,
            originalData: clientData
          });
          console.warn('[offline-conflict] Conflit enregistré (409)', { entity, entityId, reason });
        }
      } catch (conflictErr) {
        console.warn('[offline-conflict] Enregistrement conflit échoué', conflictErr);
      }
    }

    const originalRequest = error.config;
    const hasTempToken = !!localStorage.getItem('tempToken');

    // Handle session expiry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (error.response.data?.message === 'Session expired or invalid') {
        console.log('🚫 Session expirée ou invalide');
        clearSession();
        if (window.location.pathname !== '/login') safeRedirect('/login?expired=true');
        return Promise.reject(error);
      }

      // Handle 2FA requirement
      if (error.response.data?.requires2FA) {
        console.log('🔒 2FA requis');
        // Redirect to security page to complete setup/verification (avoid loops)
        if (window.location.pathname !== '/security') safeRedirect('/security');
        return Promise.reject(error);
      }
    }

    // Handle other authentication errors
    if (error.response?.status === 401) {
      if (!hasTempToken) {
        clearSession();
        if (window.location.pathname !== '/login') safeRedirect('/login');
      }
    }

    return Promise.reject(error);
  }
);

// Auth functions
export const login = async (credentials) => {
  try {
    if (credentials.tempToken) {
      // Mode vérification 2FA
      console.log('🔐 Vérification code 2FA');
      console.log('📤 Envoi vers:', API.defaults.baseURL + '/auth/verify-2fa');
      const response = await API.post('/auth/verify-2fa', { code: credentials.code, tempToken: credentials.tempToken });
      console.log('✅ Réponse 2FA:', response.data);
      const payload = response.data?.data ?? response.data; // Support enveloppe { success, data }
      const { token, user, sessionId, expiresAt } = payload || {};
      updateSession(token, user, sessionId, expiresAt);
      return { user };
    } else {
      // Mode connexion initiale
      console.log('🔑 Tentative de connexion:', { email: credentials.email });
      console.log('📤 Envoi vers:', API.defaults.baseURL + '/auth/login');
      const response = await API.post('/auth/login', {
        email: credentials.email,
        password: credentials.password,
        rememberMe: !!credentials.rememberMe
      });
      console.log('✅ Réponse serveur:', response.data);

      // Our backend wraps responses as { success, data }
      const payload = response.data?.data ?? response.data;

      if (payload.requires2FA) {
        return {
          requires2FA: true,
          tempToken: payload.tempToken,
          setupRequired: !!payload.setupRequired
        };
      }

      const { token, user, sessionId, expiresAt } = payload;
      updateSession(token, user, sessionId, expiresAt);
      return { user };
    }
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);

    // Log more details about the error
    console.error('Détails de l\'erreur:');
    console.error('- URL:', error.config?.url);
    console.error('- Méthode:', error.config?.method);
    console.error('- BaseURL:', API.defaults.baseURL);
    console.error('- Status:', error.response?.status);
    console.error('- Headers:', error.config?.headers);

    // If there's a network error (i.e., couldn't connect to server)
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
      throw new Error(`Impossible de se connecter au serveur: ${API.defaults.baseURL}. Vérifiez que le serveur backend est en cours d'exécution.`);
    }

    // Attach attempt metadata for UI if present
    if (error.response?.data?.attemptsRemaining !== undefined || error.response?.data?.lockedUntil) {
      const meta = {
        attemptsRemaining: error.response.data.attemptsRemaining,
        lockedUntil: error.response.data.lockedUntil
      };
      const err = new Error(error.response?.data?.message || 'Login failed');
      err.meta = meta;
      throw err;
    }
    throw error;
  }
};

// Password reset helpers
export const requestPasswordReset = async (email) => {
  const res = await API.post('/api/auth/password/forgot', { email });
  return res.data;
};

export const resetPassword = async ({ token, password }) => {
  const res = await API.post('/api/auth/password/reset', { token, password });
  return res.data;
};

export const logout = async () => {
  try {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      await API.delete(`/api/auth/sessions/${sessionId}`);
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearSession();
  }
};

export const verify2FA = async (code, tempToken) => {
  const fallbackTemp = tempToken || localStorage.getItem('tempToken');
  try {
    console.log(`Vérification 2FA avec le code: ${code && code.length > 0 ? '****' : 'manquant'} et tempToken: ${fallbackTemp ? 'présent' : 'manquant'}`);
    const response = await API.post('/api/auth/verify-2fa', { code, tempToken: fallbackTemp });
    console.log('Réponse de vérification 2FA:', response.status);
    const payload = response.data?.data ?? response.data; // Handle API envelope
    if (payload?.token && payload?.user && payload?.sessionId) {
      updateSession(payload.token, payload.user, payload.sessionId, payload.expiresAt);
      // Clear temp token once fully authenticated
      localStorage.removeItem('tempToken');
    }
    return payload;
  } catch (error) {
    console.error('Erreur de vérification 2FA:', error.response?.status, error.message);
    throw error;
  }
};

// Verify the code during 2FA SETUP flow (uses temp secret)
export const verify2FASetup = async (code) => {
  try {
    console.log(`Vérification setup 2FA avec le code: ${code && code.length > 0 ? '****' : 'manquant'}`);
    // Utiliser la route avec préfixe /api pour la cohérence
    const response = await API.post('/api/2fa/verify', { code });
    console.log('Réponse de vérification setup 2FA:', response.status);
    return response.data; // { success: true }
  } catch (error) {
    console.error('Erreur de vérification setup 2FA:', error.response?.status, error.message);
    console.error('URL utilisée:', error.config?.url);
    throw error;
  }
};

export const setup2FA = async () => {
  try {
    const response = await API.post('/api/2fa/setup');
    return response.data;
  } catch (err) {
    if (err.response?.status === 409) {
      // 2FA already enabled — surface a coherent shape for the UI
      return { alreadyEnabled: true };
    }
    throw err;
  }
};

export const disable2FA = async (code) => {
  const response = await API.post('/api/2fa/disable', { code });
  return response.data;
};

export const getSessions = async () => {
  const response = await API.get('/api/auth/sessions');
  const payload = response?.data?.data ?? response?.data;
  return payload;
};

export const revokeSession = async (sessionId) => {
  const response = await API.delete(`/api/auth/sessions/${sessionId}`);
  return response?.data?.data ?? response?.data;
};

export const revokeOtherSessions = async () => {
  const response = await API.delete('/api/auth/sessions/others');
  return response?.data?.data ?? response?.data;
};

export const getAuditLogs = async () => {
  const response = await API.get('/api/auth/audit-logs');
  return response?.data?.data ?? response?.data;
};

export const get2FAStatus = async () => {
  const response = await API.get('/api/2fa/status');
  return response?.data?.data ?? response?.data; // { enabled: boolean, methods: string[] }
};

export default API;

// --- Offline Sync Helpers ---
// These helpers assume the presence of /api/sync/batch endpoint.
// syncBatch(operations) -> { applied, conflicts }
// Updated timestamp to force cache refresh: ${new Date().toISOString()}
export async function syncBatch(operations) {
  const response = await API.post('/api/sync/batch', { operations });
  return response?.data?.data ?? response?.data;
}

// Utility to build an operation for the outbox
export function buildOp({ entity, action, data, entityId, version }) {
  return { entity, op: action, data, id: entityId, version, clientGeneratedAt: Date.now() };
}

// ---------------- AI Helpers (feature flagged) ----------------
const AI_ENABLED = import.meta.env.VITE_ENABLE_AI === '1' || import.meta.env.VITE_ENABLE_AI === 'true';

export async function aiSuggestTaskDescription({ title, existingDescription, projectName }) {
  if (!AI_ENABLED) throw new Error('AI disabled');
  const res = await API.post('/ai/task/suggest-description', { title, existingDescription, projectName });
  return res?.data?.data ?? res?.data;
}

export async function aiFetchProjectSummary(projectId) {
  if (!AI_ENABLED) throw new Error('AI disabled');
  const res = await API.get(`/api/ai/project/${projectId}/summary`);
  return res?.data?.data ?? res?.data;
}

export async function aiSuggestSubtasks({ title, description, projectName, max }) {
  if (!AI_ENABLED) throw new Error('AI disabled');
  const res = await API.post('/api/ai/task/suggest-subtasks', { title, description, projectName, max });
  return res?.data?.data ?? res?.data;
}

export async function aiSuggestTaskMetadata({ title, description, projectName, currentStatus, currentEstimateMinutes }) {
  if (!AI_ENABLED) throw new Error('AI disabled');
  const res = await API.post('/api/ai/task/suggest-metadata', { title, description, projectName, currentStatus, currentEstimateMinutes });
  return res?.data?.data ?? res?.data; // { suggestedStatus, estimatedMinutes, confidence }
}

// ---------------- Tasks CRUD (with optional offline queue) ----------------
export async function createTask({ title, description, project, assignee }) {
  // Basic payload
  const payload = { title, description, project, assignee };
  if (navigator && !navigator.onLine) {
    // Queue offline (lazy load db utilities)
    try {
      // Use Vite alias for stable resolution across transforms
      const { queueOperation, cacheTasks } = await import('@/offline/db.js');
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await queueOperation({ entity: 'task', action: 'upsert', data: { ...payload, id: tempId }, entityId: tempId });
      await cacheTasks([{ _id: tempId, ...payload, status: 'todo', progress: 0, version: 0, createdAt: new Date().toISOString() }]);
      return { offline: true, id: tempId };
    } catch (e) {
      console.warn('Offline queue failed, falling back to direct create', e);
    }
  }
  const res = await API.post('/api/tasks', payload);
  return res?.data?.data ?? res?.data;
}

// Delta fetch helpers (since ISO string)
export async function fetchProjectsDelta({ since }) {
  const url = since ? `/api/projects?since=${encodeURIComponent(since)}` : '/api/projects';
  const res = await API.get(url);
  return res?.data?.data ?? res?.data;
}

export async function fetchTasksDelta({ since, projectId } = {}) {
  const params = [];
  if (since) params.push(`since=${encodeURIComponent(since)}`);
  if (projectId) params.push(`projectId=${encodeURIComponent(projectId)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  const res = await API.get(`/api/tasks${qs}`);
  return res?.data?.data ?? res?.data;
}

// Update task (optimistic helper). If backend lacks endpoint, this will throw.
export async function updateTask(id, patch) {
  const res = await API.patch(`/api/tasks/${id}`, patch);
  return res?.data?.data ?? res?.data;
}
