import { useState, useEffect, useCallback } from 'react';
import API from '../api';

const PROVIDERS = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  BITBUCKET: 'bitbucket'
};

export const useGitIntegration = (provider = PROVIDERS.GITHUB) => {
  const [repositories, setRepositories] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({});

  // Vérifier la connexion
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await API.get(`/integrations/${provider}/status`);
        setConnected(response.data.connected);
      } catch (err) {
        setError('Erreur de connexion avec ' + provider);
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, [provider]);

  // Charger les repositories
  const loadRepositories = useCallback(async () => {
    if (!connected) return;

    try {
      setLoading(true);
      const response = await API.get(`/integrations/${provider}/repositories`);
      setRepositories(response.data);
    } catch (err) {
      setError(`Erreur lors du chargement des repositories ${provider}`);
    } finally {
      setLoading(false);
    }
  }, [connected, provider]);

  // Connecter un repository
  const connectRepository = async (repoId) => {
    try {
      await API.post(`/integrations/${provider}/connect`, { repoId });
      await loadRepositories();
    } catch (err) {
      throw new Error(`Erreur lors de la connexion au repository`);
    }
  };

  // Synchroniser les issues
  const syncIssues = async (repoId) => {
    try {
      setSyncStatus(prev => ({ ...prev, [repoId]: 'syncing' }));
      await API.post(`/integrations/${provider}/sync/issues`, { repoId });
      setSyncStatus(prev => ({ ...prev, [repoId]: 'completed' }));
    } catch (err) {
      setSyncStatus(prev => ({ ...prev, [repoId]: 'error' }));
      throw new Error(`Erreur de synchronisation des issues`);
    }
  };

  // Synchroniser les pull requests
  const syncPullRequests = async (repoId) => {
    try {
      setSyncStatus(prev => ({ ...prev, [repoId]: 'syncing' }));
      await API.post(`/integrations/${provider}/sync/pulls`, { repoId });
      setSyncStatus(prev => ({ ...prev, [repoId]: 'completed' }));
    } catch (err) {
      setSyncStatus(prev => ({ ...prev, [repoId]: 'error' }));
      throw new Error(`Erreur de synchronisation des pull requests`);
    }
  };

  // Créer une issue
  const createIssue = async (repoId, issueData) => {
    try {
      const response = await API.post(`/integrations/${provider}/issues/create`, {
        repoId,
        ...issueData
      });
      return response.data;
    } catch (err) {
      throw new Error(`Erreur lors de la création de l'issue`);
    }
  };

  // Créer une pull request
  const createPullRequest = async (repoId, prData) => {
    try {
      const response = await API.post(`/integrations/${provider}/pulls/create`, {
        repoId,
        ...prData
      });
      return response.data;
    } catch (err) {
      throw new Error(`Erreur lors de la création de la pull request`);
    }
  };

  // Webhook handler
  const handleWebhook = useCallback((event) => {
    switch (event.type) {
      case 'issue':
        // Mettre à jour les issues
        break;
      case 'pull_request':
        // Mettre à jour les pull requests
        break;
      case 'push':
        // Mettre à jour les commits
        break;
      default:
        console.log('Unknown webhook event:', event.type);
    }
  }, []);

  // Configuration des webhooks
  useEffect(() => {
    if (connected) {
      // Configurer les webhooks
      const setupWebhooks = async () => {
        try {
          await API.post(`/integrations/${provider}/webhooks/setup`);
        } catch (err) {
          console.error('Error setting up webhooks:', err);
        }
      };

      setupWebhooks();
    }
  }, [connected, provider]);

  return {
    repositories,
    connected,
    loading,
    error,
    syncStatus,
    loadRepositories,
    connectRepository,
    syncIssues,
    syncPullRequests,
    createIssue,
    createPullRequest,
    handleWebhook
  };
};
