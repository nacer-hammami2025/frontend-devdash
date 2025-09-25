import { useCallback, useState } from 'react';
import api from '../api';

async function request(path, body) {
    const res = await api.fetch(path, { method: 'POST', body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error?.message || json.message || 'Erreur API');
    return json.data;
}

export function useCommentAnalysis() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const analyze = useCallback(async ({ taskId, commentId }) => {
        setLoading(true); setError(null);
        try {
            const data = await request('/ai/comments/analyze', { taskId, commentId });
            setResult(data);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, []);

    return { result, loading, error, analyze };
}
