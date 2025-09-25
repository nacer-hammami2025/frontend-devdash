import { useCallback, useState } from 'react';
import API from '../api';

export const useAuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    type: [],
    user: null,
    resource: null
  });

  // Charger les logs
  const loadLogs = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      const response = await API.get('/auth/audit-logs', {
        params: {
          ...filters,
          ...options
        }
      });
      const raw = Array.isArray(response.data) ? response.data : [];
      // Normalize to the shape expected by the UI
      const normalized = raw.map((l) => ({
        id: l.id || l._id || String(l._id || ''),
        timestamp: l.timestamp || l.createdAt || l.created_at || null,
        type: l.type || l.action || 'event',
        user: (l.user && (l.user.name || l.user.email))
          || (typeof l.user === 'string' ? l.user : 'Système'),
        details: l.details || ''
      }));
      setLogs(normalized);
    } catch (err) {
      setError('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Ajouter un événement au log
  const logEvent = useCallback(async (eventData) => {
    try {
      await API.post('/audit/logs', {
        type: eventData.type,
        details: eventData.details,
        resource: eventData.resource,
        metadata: eventData.metadata
      });
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement de l\'événement:', err);
    }
  }, []);

  // Exporter les logs
  const exportLogs = useCallback(async (format) => {
    try {
      setLoading(true);
      setError(null);
      setDownloadProgress(0);

      const response = await API.get(`/auth/audit-logs/export/${format}`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setDownloadProgress(percentCompleted);
        }
      });

      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export audit logs');
      return false;
    } finally {
      setLoading(false);
      setDownloadProgress(0);
    }
  }, []);

  // Analyser les tendances des logs
  const analyzeTrends = useCallback(async (options = {}) => {
    try {
      const response = await API.get('/audit/logs/trends', {
        params: {
          ...filters,
          ...options
        }
      });
      return response.data;
    } catch (err) {
      throw new Error('Erreur lors de l\'analyse des tendances');
    }
  }, [filters]);

  // Rechercher dans les logs
  const searchLogs = useCallback(async (searchQuery) => {
    try {
      setLoading(true);
      const response = await API.get('/audit/logs/search', {
        params: {
          query: searchQuery,
          ...filters
        }
      });
      setLogs(response.data);
    } catch (err) {
      setError('Erreur lors de la recherche dans les logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Obtenir les détails d'un log spécifique
  const getLogDetails = useCallback(async (logId) => {
    try {
      const response = await API.get(`/audit/logs/${logId}`);
      return response.data;
    } catch (err) {
      throw new Error('Erreur lors de la récupération des détails du log');
    }
  }, []);

  return {
    logs,
    loading,
    error,
    filters,
    setFilters,
    loadLogs,
    logEvent,
    exportLogs,
    analyzeTrends,
    searchLogs,
    getLogDetails
  };
};
