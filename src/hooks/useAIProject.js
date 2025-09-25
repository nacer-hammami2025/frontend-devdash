import { useCallback, useState } from 'react';
import api from '../api';

// Helper unified fetch wrapper expecting { success, data }
async function request(path, opts = {}) {
    const res = await api.fetch(path, { method: 'POST', ...opts });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error?.message || json.message || 'Erreur API');
    return json.data;
}

export function useAIProject(projectId) {
    const [summary, setSummary] = useState(null);
    const [suggestions, setSuggestions] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState({});

    const generateSummary = useCallback(async () => {
        if (!projectId) return;
        setLoadingSummary(true); setError(null);
        try {
            const data = await request(`/ai/projects/${projectId}/summary`);
            setSummary(data);
            setMeta(m => ({ ...m, summaryFetchedAt: Date.now() }));
        } catch (e) { setError(e.message); }
        finally { setLoadingSummary(false); }
    }, [projectId]);

    const generateSuggestions = useCallback(async () => {
        if (!projectId) return;
        setLoadingSuggestions(true); setError(null);
        try {
            const data = await request(`/ai/projects/${projectId}/suggestions`);
            setSuggestions(data);
            setMeta(m => ({ ...m, suggestionsFetchedAt: Date.now() }));
        } catch (e) { setError(e.message); }
        finally { setLoadingSuggestions(false); }
    }, [projectId]);

    return {
        summary,
        suggestions,
        loadingSummary,
        loadingSuggestions,
        error,
        meta,
        generateSummary,
        generateSuggestions
    };
}
