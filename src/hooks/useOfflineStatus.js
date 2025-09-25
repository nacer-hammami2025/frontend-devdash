import { useState, useEffect } from 'react';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineSyncPending, setOfflineSyncPending] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);

  useEffect(() => {
    // Gestionnaires d'événements de connexion
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Écoute des changements de statut de connexion
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Enregistrement du Service Worker (production uniquement)
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Synchronisation des données hors ligne
  const syncOfflineData = async () => {
    if (!navigator.onLine) return;

    setOfflineSyncPending(true);
    try {
      // Récupération des actions en attente depuis IndexedDB
      const actions = await getPendingActions();
      setPendingActions(actions);

      // Demande de synchronisation au Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready;
        await navigator.serviceWorker.sync.register('sync-data');
      }

      // Nettoyage des actions synchronisées
      await clearPendingActions();
      setPendingActions([]);
    } catch (error) {
      console.error('Error syncing offline data:', error);
    } finally {
      setOfflineSyncPending(false);
    }
  };

  // Sauvegarde d'une action pour synchronisation ultérieure
  const saveOfflineAction = async (action) => {
    try {
      await addPendingAction(action);
      const actions = await getPendingActions();
      setPendingActions(actions);
    } catch (error) {
      console.error('Error saving offline action:', error);
    }
  };

  return {
    isOnline,
    offlineSyncPending,
    pendingActions,
    saveOfflineAction,
    syncOfflineData
  };
}

// Fonctions utilitaires IndexedDB
const DB_NAME = 'DevDashOfflineDB';
const STORE_NAME = 'pendingActions';

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function addPendingAction(action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({
      ...action,
      timestamp: new Date().toISOString()
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPendingActions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearPendingActions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
