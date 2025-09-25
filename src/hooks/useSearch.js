import { useState, useEffect, useCallback } from 'react';
import API from '../api';

const DEBOUNCE_DELAY = 300;

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    type: [],
    status: [],
    assignee: [],
    priority: [],
    dueDate: null,
    tags: []
  });
  const [results, setResults] = useState({
    projects: [],
    tasks: [],
    documents: [],
    users: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery, searchFilters) => {
      if (!searchQuery.trim()) {
        setResults({
          projects: [],
          tasks: [],
          documents: [],
          users: []
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await API.post('/search', {
          query: searchQuery,
          filters: searchFilters
        });

        setResults(response.data);
      } catch (err) {
        setError('Erreur lors de la recherche');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY),
    []
  );

  useEffect(() => {
    debouncedSearch(query, filters);
  }, [query, filters, debouncedSearch]);

  const searchSuggestions = useCallback(async (input) => {
    try {
      const response = await API.get('/search/suggestions', {
        params: { query: input }
      });
      return response.data;
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      return [];
    }
  }, []);

  const getRecentSearches = useCallback(async () => {
    try {
      const response = await API.get('/search/recent');
      return response.data;
    } catch (err) {
      console.error('Error fetching recent searches:', err);
      return [];
    }
  }, []);

  const saveSearch = useCallback(async (searchData) => {
    try {
      await API.post('/search/save', searchData);
    } catch (err) {
      console.error('Error saving search:', err);
    }
  }, []);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    loading,
    error,
    searchSuggestions,
    getRecentSearches,
    saveSearch
  };
};

// Utilitaire de debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
