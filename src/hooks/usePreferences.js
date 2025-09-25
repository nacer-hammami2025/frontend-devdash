import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../api';

const STORAGE_KEY = 'devdash_preferences';
const DEBOUNCE_DELAY = 500; // ms

const defaultPreferences = {
  // Apparence
  theme: 'light', // light, dark, system
  accentColor: '#2563eb',
  fontSize: 'medium', // small, medium, large
  denseMode: false,
  
  // Notifications
  notifications: {
    email: {
      enabled: true,
      frequency: 'immediate', // immediate, daily, weekly
      digest: true,
      time: '09:00'
    },
    push: {
      enabled: true,
      types: {
        taskAssigned: true,
        taskUpdated: true,
        commentAdded: true,
        projectInvite: true,
        deadlineApproaching: true,
        mention: true,
        teamUpdates: true,
        milestoneCompleted: true
      },
      quiet: { start: '22:00', end: '07:00' }
    },
    sound: true,
    desktop: true
  },

  // Mode hors ligne
  offline: {
    enabled: true,
    syncOnStartup: true,
    cacheProjects: true,
    cacheTasks: true,
    maxCacheSize: 50 // MB
  },

  // Mise en page
  dashboardLayout: new Map([
    ['projects', { visible: true, position: 0, expanded: true }],
    ['tasks', { visible: true, position: 1, expanded: true }],
    ['activities', { visible: true, position: 2, expanded: false }],
    ['calendar', { visible: true, position: 3, expanded: false }],
    ['notes', { visible: false, position: 4, expanded: false }]
  ]),

  // Productivité
  defaultView: 'kanban', // kanban, list, calendar
  autoSave: true,
  confirmBeforeDelete: true,
  showCompletedTasks: true,
  taskReminders: true,
  language: 'fr',
  dateFormat: 'DD/MM/YYYY',
  startOfWeek: 1 // 0 = Sunday, 1 = Monday
};

export const usePreferences = () => {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ saving: false, message: '' });

  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(null);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Essayer d'abord de charger depuis le stockage local
      const cachedPrefs = localStorage.getItem(STORAGE_KEY);
      if (cachedPrefs) {
        const parsed = JSON.parse(cachedPrefs);
        setPreferences(parsed);
      }

      // Ensuite, charger depuis l'API
      const response = await API.get('/profile');
      const serverPrefs = response.data.user.preferences || defaultPreferences;
      
      // Mettre à jour le cache local et l'état
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serverPrefs));
      setPreferences(serverPrefs);
      lastSavedRef.current = JSON.stringify(serverPrefs);
    } catch (err) {
      setError('Erreur lors du chargement des préférences');
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const savePreferences = useCallback(async (newPreferences) => {
    // Annuler tout enregistrement en attente
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Sauvegarder dans le stockage local immédiatement
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    
    // Si le thème a changé, appliquer le changement immédiatement
    if (newPreferences.theme !== preferences.theme) {
      document.documentElement.setAttribute('data-theme', newPreferences.theme);
    }

    // Mettre à jour l'état local
    setPreferences(newPreferences);

    // Si les préférences n'ont pas changé depuis le dernier enregistrement, ne pas envoyer à l'API
    if (JSON.stringify(newPreferences) === lastSavedRef.current) {
      return;
    }

    setSaveStatus({ saving: true, message: '' });

    // Enregistrer sur l'API avec debounce
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await API.put('/profile/preferences', { preferences: newPreferences });
        lastSavedRef.current = JSON.stringify(newPreferences);
        setSaveStatus({ saving: false, message: 'Préférences enregistrées avec succès' });
        
        // Effacer le message après 3 secondes
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, message: '' }));
        }, 3000);
      } catch (err) {
        setSaveStatus({ 
          saving: false, 
          message: 'Erreur lors de l\'enregistrement des préférences'
        });
        console.error('Error saving preferences:', err);
      }
    }, DEBOUNCE_DELAY);
  }, [preferences.theme]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Appliquer le thème initial
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preferences.theme);
  }, []);

  return {
    preferences,
    setPreferences,
    loading,
    error,
    saveStatus,
    savePreferences,
    loadPreferences
  };
};
