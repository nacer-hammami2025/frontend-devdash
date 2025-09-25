import { useCallback, useEffect, useState } from 'react';
import API from '../api';

export const useSession = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les sessions actives
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get('/api/auth/sessions');
      setActiveSessions(response.data.sessions);
      setCurrentSession(response.data.currentSession);
    } catch (err) {
      setError('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Révoquer une session spécifique
  const revokeSession = useCallback(async (sessionId) => {
    try {
      await API.delete(`/api/auth/sessions/${sessionId}`);
      setActiveSessions(prev =>
        prev.filter(session => session.id !== sessionId)
      );
    } catch (err) {
      throw new Error('Erreur lors de la révocation de la session');
    }
  }, []);

  // Révoquer toutes les autres sessions
  const revokeAllOtherSessions = useCallback(async () => {
    try {
      await API.delete('/api/auth/sessions/others');
      setActiveSessions(prev =>
        prev.filter(session => session.id === currentSession?.id)
      );
    } catch (err) {
      throw new Error('Erreur lors de la révocation des sessions');
    }
  }, [currentSession]);

  // Mettre à jour les préférences de session
  const updateSessionPreferences = useCallback(async (preferences) => {
    try {
      await API.put('/api/auth/sessions/preferences', preferences);
    } catch (err) {
      throw new Error('Erreur lors de la mise à jour des préférences');
    }
  }, []);

  // Vérifier la validité de la session
  const checkSessionValidity = useCallback(async () => {
    try {
      const response = await API.get('/api/auth/sessions/check');
      return response.data.valid;
    } catch (err) {
      return false;
    }
  }, []);

  // Rafraîchir le token de session
  const refreshSession = useCallback(async () => {
    try {
      const response = await API.post('/api/auth/sessions/refresh');
      return response.data.token;
    } catch (err) {
      throw new Error('Erreur lors du rafraîchissement de la session');
    }
  }, []);

  // Configuration du rafraîchissement automatique
  useEffect(() => {
    if (!currentSession?.expiresAt) return;

    const expiresAt = new Date(currentSession.expiresAt).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000); // 5 minutes avant expiration

    if (refreshTime <= 0) {
      refreshSession();
      return;
    }

    const refreshTimer = setTimeout(refreshSession, refreshTime);
    return () => clearTimeout(refreshTimer);
  }, [currentSession, refreshSession]);

  // Vérification périodique de la validité
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      const isValid = await checkSessionValidity();
      if (!isValid) {
        window.location.href = '/login';
      }
    }, 5 * 60 * 1000); // Toutes les 5 minutes

    return () => clearInterval(checkInterval);
  }, [checkSessionValidity]);

  return {
    activeSessions,
    currentSession,
    loading,
    error,
    loadSessions,
    revokeSession,
    revokeAllOtherSessions,
    updateSessionPreferences,
    checkSessionValidity,
    refreshSession
  };
};
