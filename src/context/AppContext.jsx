import React, { createContext, useContext } from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const AppContext = createContext();

export function AppProvider({ children }) {
  const {
    isOnline,
    offlineSyncPending,
    pendingActions,
    saveOfflineAction,
    syncOfflineData
  } = useOfflineStatus();

  const {
    registerShortcut,
    getShortcuts
  } = useKeyboardShortcuts();

  const value = {
    // État de la connexion
    isOnline,
    offlineSyncPending,
    pendingActions,
    saveOfflineAction,
    syncOfflineData,

    // Raccourcis clavier
    registerShortcut,
    getShortcuts,

    // État PWA
    isPWA: window.matchMedia('(display-mode: standalone)').matches,
    
    // Indicateur de connexion
    showConnectionStatus: true
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {/* Indicateur de connexion */}
      {value.showConnectionStatus && (
        <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
          {offlineSyncPending && (
            <div className="sync-status">
              Synchronisation en cours...
              {pendingActions.length > 0 && 
                `(${pendingActions.length} actions en attente)`
              }
            </div>
          )}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
