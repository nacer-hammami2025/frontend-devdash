import { useCallback, useState } from 'react';
import { aiFetchProjectSummary, aiSuggestSubtasks, aiSuggestTaskDescription } from '../api';

const AI_ENABLED = import.meta.env.VITE_ENABLE_AI === '1' || import.meta.env.VITE_ENABLE_AI === 'true';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState({}); // project summaries cache

  const suggestTaskDescription = useCallback(async ({ title, existingDescription, projectName }) => {
    if (!AI_ENABLED) return { disabled: true };
    setLoading(true); setError(null);
    try {
      const data = await aiSuggestTaskDescription({ title, existingDescription, projectName });
      return data;
    } catch (e) {
      setError(e); return { error: e.message };
    } finally { setLoading(false); }
  }, []);

  const fetchProjectSummary = useCallback(async (projectId, { force = false } = {}) => {
    if (!AI_ENABLED) return { disabled: true };
    if (!force && cache[projectId]) return cache[projectId];
    setLoading(true); setError(null);
    try {
      const data = await aiFetchProjectSummary(projectId);
      setCache(prev => ({ ...prev, [projectId]: data }));
      return data;
    } catch (e) {
      setError(e); return { error: e.message };
    } finally { setLoading(false); }
  }, [cache]);

  const suggestSubtasks = useCallback(async ({ title, description, projectName, max }) => {
    if (!AI_ENABLED) return { disabled: true };
    const cacheKey = `subtasks:${title}|${projectName}|${max}`;
    if (cache[cacheKey]) return cache[cacheKey];
    setLoading(true); setError(null);
    try {
      const data = await aiSuggestSubtasks({ title, description, projectName, max });
      setCache(prev => ({ ...prev, [cacheKey]: data }));
      return data;
    } catch (e) {
      setError(e); return { error: e.message };
    } finally { setLoading(false); }
  }, [cache]);

  return { AI_ENABLED, loading, error, suggestTaskDescription, fetchProjectSummary, suggestSubtasks, cache };
}
