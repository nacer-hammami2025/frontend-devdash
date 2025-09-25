// Bump CACHE_NAME version to ensure clients see new logic (fix dev module MIME issue)
const CACHE_NAME = 'devdash-v1-1';
const API_CACHE_NAME = 'devdash-api-v1';
const USER_CACHE_NAME = 'devdash-user-v1';

// Ressources statiques à mettre en cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
  '/logo.svg',
  '/static/js/main.js',
  '/static/css/main.css',
  '/static/js/vendor.js',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon.png'
];

// Routes API à mettre en cache
const API_ROUTES = [
  '/api/projects',
  '/api/tasks',
  '/api/users/me',
  '/api/teams',
  '/api/notifications',
  '/api/activities',
  '/api/preferences'
];

// Durée de mise en cache par type de ressource
const CACHE_DURATION = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 jours
  api: 24 * 60 * 60 * 1000, // 24 heures
  user: 7 * 24 * 60 * 60 * 1000 // 7 jours
};

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache des ressources statiques
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache initial pour l'API
      caches.open(API_CACHE_NAME)
    ])
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Stratégies de mise en cache
const cacheStrategies = {
  // Cache First: Essaie le cache d'abord, puis le réseau
  async cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
      // Mise à jour en arrière-plan
      this.updateCache(request);
      return cached;
    }
    return this.networkFirst(request);
  },

  // Network First: Essaie le réseau d'abord, puis le cache
  async networkFirst(request) {
    try {
      const response = await fetch(request);
      await this.updateCache(request, response.clone());
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw new Error('No cached data available');
    }
  },

  // Stale While Revalidate: Retourne le cache pendant la mise à jour
  async staleWhileRevalidate(request) {
    const cached = await caches.match(request);
    const networkPromise = fetch(request).then(async response => {
      await this.updateCache(request, response.clone());
      return response;
    });
    return cached || networkPromise;
  },

  // Mise à jour du cache avec gestion de la durée de vie
  async updateCache(request, response) {
    const cache = await this.getCacheForRequest(request);
    if (!cache) return;

    const now = Date.now();
    const metadata = {
      cached: now,
      expires: now + this.getCacheDuration(request)
    };

    // Stockage de la réponse avec les métadonnées
    const responseToCache = response.clone();
    const headers = new Headers(responseToCache.headers);
    headers.append('sw-cache-metadata', JSON.stringify(metadata));

    const augmentedResponse = new Response(await responseToCache.blob(), {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers
    });

    await cache.put(request, augmentedResponse);
  },

  // Détermine le cache approprié pour une requête
  async getCacheForRequest(request) {
    const url = new URL(request.url);
    if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
      return await caches.open(CACHE_NAME);
    } else if (API_ROUTES.some(route => url.pathname.includes(route))) {
      return await caches.open(API_CACHE_NAME);
    } else if (url.pathname.includes('/api/users/')) {
      return await caches.open(USER_CACHE_NAME);
    }
    return null;
  },

  // Détermine la durée de mise en cache selon le type de requête
  getCacheDuration(request) {
    const url = new URL(request.url);
    if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
      return CACHE_DURATION.static;
    } else if (API_ROUTES.some(route => url.pathname.includes(route))) {
      return CACHE_DURATION.api;
    } else if (url.pathname.includes('/api/users/')) {
      return CACHE_DURATION.user;
    }
    return CACHE_DURATION.api; // Durée par défaut
  }
};

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Gestion selon le type de requête
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    // Ressources statiques : Cache First
    event.respondWith(cacheStrategies.cacheFirst(event.request));
  }
  else if (API_ROUTES.some(route => url.pathname.includes(route))) {
    // API : Stale While Revalidate
    event.respondWith(cacheStrategies.staleWhileRevalidate(event.request));
  }
  else if (url.pathname.includes('/api/')) {
    // Autres requêtes API : Network First
    event.respondWith(cacheStrategies.networkFirst(event.request));
  }
  else {
    // Autres ressources : Cache First
    event.respondWith(cacheStrategies.cacheFirst(event.request));
  }
});

// Listen for client messages (e.g., to trigger immediate sync flush)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'TRIGGER_SYNC') {
    // Attempt background sync; fallback to immediate syncData call
    if (self.registration.sync) {
      self.registration.sync.register('sync-data').catch(() => {
        syncData();
      });
    } else {
      syncData();
    }
  }
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  } else if (event.tag === 'sync-preferences') {
    event.waitUntil(syncPreferences());
  } else if (event.tag === 'devdash-outbox-sync') {
    event.waitUntil(
      (async () => {
        const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
        for (const c of allClients) {
          c.postMessage({ type: 'OFFLINE_OUTBOX_FLUSH' });
        }
      })()
    );
  }
});

// Synchronisation des données
async function syncData() {
  const db = await openDB();
  const pendingActions = await db.getAll('pendingActions');

  for (const action of pendingActions) {
    try {
      const response = await performAction(action);
      if (response.ok) {
        await db.delete('pendingActions', action.id);
        // Mise à jour du cache
        const cache = await caches.open(API_CACHE_NAME);
        await cache.put(action.url, response);
      } else {
        console.error('Sync failed for action:', action, response.statusText);
      }
    } catch (error) {
      console.error('Sync error for action:', action, error);
      // Réessayer plus tard si c'est une erreur réseau
      if (error.name === 'NetworkError') {
        await registerSync('sync-data');
      }
    }
  }
}

// Synchronisation des préférences
async function syncPreferences() {
  const db = await openDB();
  const preferences = await db.get('preferences', 'current');

  if (preferences) {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        // Mise à jour du cache
        const cache = await caches.open(USER_CACHE_NAME);
        await cache.put('/api/preferences', response);
      }
    } catch (error) {
      console.error('Preferences sync failed:', error);
      await registerSync('sync-preferences');
    }
  }
}

// Utilitaire pour enregistrer une synchronisation
async function registerSync(tag) {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await registration.sync.register(tag);
    } catch (error) {
      console.error('Sync registration failed:', error);
    }
  }
}

// Gestion des notifications push
// Gestion des notifications push
self.addEventListener('push', (event) => {
  const data = event.data.json();

  // Vérifier les préférences de notification de l'utilisateur
  const shouldNotify = async () => {
    const db = await openDB();
    const prefs = await db.get('preferences', 'current');

    if (!prefs || !prefs.notifications.push.enabled) {
      return false;
    }

    // Vérifier la période de silence
    const now = new Date();
    const hour = now.getHours();
    const quietHours = prefs.notifications.push.quiet;

    if (quietHours) {
      const startHour = parseInt(quietHours.start.split(':')[0]);
      const endHour = parseInt(quietHours.end.split(':')[0]);

      if (startHour < endHour) {
        if (hour >= startHour && hour < endHour) return false;
      } else {
        if (hour >= startHour || hour < endHour) return false;
      }
    }

    // Vérifier le type de notification
    const notifType = data.type;
    return prefs.notifications.push.types[notifType] !== false;
  };

  event.waitUntil(
    shouldNotify().then(canNotify => {
      if (!canNotify) return;

      // Options de notification enrichies
      const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        image: data.image,
        tag: data.tag || 'default',
        data: {
          url: data.url,
          type: data.type,
          id: data.id
        },
        actions: getNotificationActions(data.type),
        vibrate: [200, 100, 200],
        timestamp: data.timestamp || Date.now(),
        renotify: true,
        silent: false,
        requireInteraction: data.important || false
      };

      return self.registration.showNotification(data.title, options);
    })
  );
});

// Actions possibles selon le type de notification
function getNotificationActions(type) {
  const actions = {
    taskAssigned: [
      { action: 'accept', title: 'Accepter' },
      { action: 'decline', title: 'Refuser' }
    ],
    taskUpdated: [
      { action: 'view', title: 'Voir' },
      { action: 'dismiss', title: 'Plus tard' }
    ],
    comment: [
      { action: 'reply', title: 'Répondre' },
      { action: 'dismiss', title: 'Ignorer' }
    ],
    projectInvite: [
      { action: 'accept', title: 'Accepter' },
      { action: 'decline', title: 'Refuser' }
    ],
    deadline: [
      { action: 'view', title: 'Voir' },
      { action: 'remind', title: 'Rappel 1h' }
    ]
  };

  return actions[type] || [];
}

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  // Traitement selon l'action choisie
  const handleAction = async () => {
    if (action === 'accept' && data.type === 'taskAssigned') {
      await fetch(`/api/tasks/${data.id}/accept`, { method: 'POST' });
    } else if (action === 'decline' && data.type === 'taskAssigned') {
      await fetch(`/api/tasks/${data.id}/decline`, { method: 'POST' });
    } else if (action === 'reply' && data.type === 'comment') {
      // Ouvrir la page avec la zone de commentaire focus
      data.url += '#comment';
    } else if (action === 'remind' && data.type === 'deadline') {
      // Programmer un nouveau rappel dans 1h
      const now = Date.now();
      await fetch(`/api/tasks/${data.id}/remind`, {
        method: 'POST',
        body: JSON.stringify({ time: now + 3600000 })
      });
    }

    // Ouvrir l'URL associée à la notification
    if (data.url) {
      const allClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Réutiliser une fenêtre existante si possible
      for (const client of allClients) {
        if (client.url === data.url && 'focus' in client) {
          return client.focus();
        }
      }

      // Sinon, ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(data.url);
      }
    }
  };

  event.waitUntil(handleAction());
});
