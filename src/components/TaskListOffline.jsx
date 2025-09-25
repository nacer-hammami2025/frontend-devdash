import { useEffect, useState } from 'react';
import { aiSuggestTaskMetadata, updateTask } from '../api';
import { useConflicts } from '../hooks/useConflicts';
import { useOfflineSync } from '../hooks/useOfflineSync';
import useOfflineTasks from '../hooks/useOfflineTasks';

const AI_ENABLED = import.meta.env.VITE_ENABLE_AI === '1' || import.meta.env.VITE_ENABLE_AI === 'true';

// Simple list UI with offline indicators + inline create/edit
export default function TaskListOffline({ projectId }) {
    const { tasks, loading, deltaLoading, stale, error, refresh, lastDelta, createInline, updateInline } = useOfflineTasks({ projectId });
    const { outboxPending } = useOfflineSync();
    const { conflicts } = useConflicts();
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newSuggestion, setNewSuggestion] = useState(null); // { suggestedStatus, estimatedMinutes, confidence }
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editSuggestion, setEditSuggestion] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [dataAge, setDataAge] = useState('');
    const AUTO_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
    const [autoRefreshedFor, setAutoRefreshedFor] = useState(null); // stores lastDelta value we already auto-refreshed on
    const [showAutoBadge, setShowAutoBadge] = useState(false);
    const conflictTaskIds = new Set(conflicts.filter(c => c.collection === 'tasks').map(c => c.docId));
    const exactLastDelta = lastDelta ? new Date(lastDelta) : null;
    const exactLastDeltaTooltip = exactLastDelta ? 'Dernière synchro: ' + exactLastDelta.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : '';

    useEffect(() => {
        if (!lastDelta) { setDataAge(''); return; }
        const update = () => {
            const diff = Date.now() - new Date(lastDelta).getTime();
            // Auto refresh logic: if diff passes threshold, online, not loading, and we haven't already refreshed for this lastDelta
            if (diff > AUTO_REFRESH_THRESHOLD_MS && navigator.onLine && !deltaLoading && autoRefreshedFor !== lastDelta) {
                // Fire refresh asynchronously to avoid state updates mid-render
                setAutoRefreshedFor(lastDelta);
                setShowAutoBadge(true);
                setTimeout(() => setShowAutoBadge(false), 5000);
                // Small timeout so UI can render the aged value once
                setTimeout(() => {
                    try { refresh(); } catch (e) { /* ignore */ }
                }, 150);
            }
            if (diff < 4000) { setDataAge("à l'instant"); return; }
            const sec = Math.floor(diff / 1000);
            if (sec < 60) { setDataAge('il y a ' + sec + 's'); return; }
            const min = Math.floor(sec / 60);
            // Show minutes + seconds precision if under 2 minutes total
            if (sec < 120) {
                const rem = sec % 60;
                setDataAge('il y a ' + min + 'm ' + (rem < 10 ? '0' + rem : rem) + 's');
                return;
            }
            if (min < 60) { setDataAge('il y a ' + min + 'm'); return; }
            const hr = Math.floor(min / 60);
            if (hr < 24) { setDataAge('il y a ' + hr + 'h'); return; }
            const day = Math.floor(hr / 24);
            setDataAge('il y a ' + day + 'j');
        };
        update();
        const id = setInterval(update, 5000);
        return () => clearInterval(id);
    }, [lastDelta, deltaLoading, refresh, autoRefreshedFor]);

    // Reset autoRefreshedFor when lastDelta changes (new data fetched)
    useEffect(() => {
        if (autoRefreshedFor && lastDelta && autoRefreshedFor !== lastDelta) {
            setAutoRefreshedFor(null);
        }
    }, [lastDelta]);

    const pulseStyle = {
        animation: 'pulseFade 1.4s ease-in-out infinite'
    };

    // Inject keyframes for auto-refresh badge animation (fade/slide) once
    if (typeof document !== 'undefined' && !document.getElementById('autoRefreshBadgeKeyframes')) {
        const style = document.createElement('style');
        style.id = 'autoRefreshBadgeKeyframes';
        style.innerHTML = `@keyframes autoBadgeIn {0%{opacity:0;transform:translateY(-4px)}100%{opacity:1;transform:translateY(0)}}@keyframes autoBadgeOut {0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-4px)}}`;
        document.head.appendChild(style);
    }

    // Inject keyframes once (naive approach) – could be moved globally
    if (typeof document !== 'undefined' && !document.getElementById('pulseFadeKeyframes')) {
        const style = document.createElement('style');
        style.id = 'pulseFadeKeyframes';
        style.innerHTML = `@keyframes pulseFade { 0%{opacity:1} 50%{opacity:.35} 100%{opacity:1} }`;
        document.head.appendChild(style);
    }

    if (loading) return <div>Chargement des tâches locales…</div>;
    if (error) return <div className="error">Erreur: {error}</div>;

    async function handleCreate(e) {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setSubmitting(true);
        try {
            await createInline({ title: newTitle.trim(), description: newDesc.trim(), status: newSuggestion?.suggestedStatus, estimatedMinutes: newSuggestion?.estimatedMinutes });
            setNewTitle('');
            setNewDesc('');
            setNewSuggestion(null);
        } finally { setSubmitting(false); }
    }

    async function fetchNewMetadataSuggestion() {
        if (!newTitle.trim()) return;
        setAiLoading(true);
        try {
            const res = await aiSuggestTaskMetadata({ title: newTitle.trim(), description: newDesc.trim(), projectName: '', currentStatus: '', currentEstimateMinutes: undefined });
            setNewSuggestion(res);
        } catch (e) {
            console.warn('AI metadata suggestion failed', e);
        } finally { setAiLoading(false); }
    }

    function beginEdit(t) {
        setEditingId(t.id || t._id);
        setEditTitle(t.title || '');
        setEditDesc(t.description || '');
        setEditSuggestion(null);
    }

    async function saveEdit(id) {
        const patch = { title: editTitle, description: editDesc, status: editSuggestion?.suggestedStatus, estimatedMinutes: editSuggestion?.estimatedMinutes };
        // Remove undefined fields to avoid overwriting
        Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);
        await updateInline(id, patch);
        if (navigator.onLine && !String(id).startsWith('tmp-')) {
            try { await updateTask(id, patch); } catch { /* ignore */ }
        }
        setEditingId(null);
    }

    async function fetchEditMetadataSuggestion(task) {
        if (!editTitle.trim()) return;
        setAiLoading(true);
        try {
            const res = await aiSuggestTaskMetadata({
                title: editTitle.trim(),
                description: editDesc.trim(),
                projectName: '',
                currentStatus: task.status,
                currentEstimateMinutes: task.estimatedMinutes
            });
            setEditSuggestion(res);
        } catch (e) {
            console.warn('AI metadata suggestion failed', e);
        } finally { setAiLoading(false); }
    }

    return (
        <div className="task-list-offline">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0 }}>Tâches</h2>
                {deltaLoading && <span style={{ fontSize: 12, color: '#888' }}>Maj…</span>}
                {showAutoBadge && !deltaLoading && (
                    <span
                        style={{
                            fontSize: 11,
                            background: '#2563eb',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: 4,
                            animation: 'autoBadgeIn 220ms ease-out, autoBadgeOut 400ms ease-in 4.4s forwards'
                        }}
                        title="Rafraîchissement automatique déclenché (inactivité > 10 min)"
                    >
                        Auto-refresh
                    </span>
                )}
                {stale && !deltaLoading && (
                    <span
                        style={{ fontSize: 11, background: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4, ...pulseStyle }}
                        title={(exactLastDeltaTooltip ? exactLastDeltaTooltip + '\n' : '') + 'Données potentiellement périmées; un événement serveur a signalé des changements.'}
                    >
                        Stale
                    </span>
                )}
                {lastDelta && !deltaLoading && (
                    <span style={{ fontSize: 11, color: '#666' }} title={exactLastDeltaTooltip}>• {dataAge || ''}</span>
                )}
                <button onClick={refresh} style={{ marginLeft: 'auto' }}>Rafraîchir</button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
                <strong>Nouvelle tâche</strong>
                <input placeholder="Titre" value={newTitle} onChange={e => setNewTitle(e.target.value)} disabled={submitting} />
                <textarea placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} disabled={submitting} />
                {newSuggestion && (
                    <div style={{ fontSize: 12, background: '#f5f7ff', padding: 6, borderRadius: 4 }}>
                        <div><strong>Statut suggéré:</strong> {newSuggestion.suggestedStatus}</div>
                        <div><strong>Durée estimée:</strong> ~{newSuggestion.estimatedMinutes} min</div>
                        <div style={{ opacity: 0.7 }}>Confiance: {(newSuggestion.confidence * 100).toFixed(0)}%</div>
                        <button type="button" style={{ marginTop: 4 }} onClick={() => setNewSuggestion(null)}>Retirer</button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="submit" disabled={submitting || !newTitle.trim()}>Créer</button>
                    {AI_ENABLED && <button type="button" onClick={fetchNewMetadataSuggestion} disabled={aiLoading || !newTitle.trim()}>AI Statut & Durée</button>}
                    {aiLoading && <span style={{ fontSize: 12 }}>AI…</span>}
                    {submitting && <span style={{ fontSize: 12 }}>Ajout…</span>}
                </div>
            </form>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {tasks.map(t => {
                    const id = t.id || t._id;
                    const isPending = outboxPending && outboxPending.some(op => op.collection === 'tasks' && op.docId === id);
                    const inConflict = conflictTaskIds.has(id);
                    const editing = editingId === id;
                    return (
                        <li key={id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, marginBottom: 6, background: inConflict ? '#ffecec' : isPending ? '#fff9e6' : '#fff' }}>
                            {!editing && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <strong style={{ flex: 1 }}>{t.title || 'Sans titre'}</strong>
                                    {t.status && <span style={{ fontSize: 11, background: '#eef', padding: '2px 6px', borderRadius: 4 }}>{t.status}</span>}
                                    {isPending && <span style={{ fontSize: 11, background: '#ffce00', padding: '2px 6px', borderRadius: 4 }}>En attente</span>}
                                    {inConflict && <span style={{ fontSize: 11, background: '#ff4d4f', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>Conflit</span>}
                                    <button onClick={() => beginEdit(t)} style={{ fontSize: 12 }}>Modifier</button>
                                </div>
                            )}
                            {editing && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                                    <textarea rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                                    {editSuggestion && (
                                        <div style={{ fontSize: 12, background: '#f5f7ff', padding: 6, borderRadius: 4 }}>
                                            <div><strong>Statut suggéré:</strong> {editSuggestion.suggestedStatus}</div>
                                            <div><strong>Durée estimée:</strong> ~{editSuggestion.estimatedMinutes} min</div>
                                            <div style={{ opacity: 0.7 }}>Confiance: {(editSuggestion.confidence * 100).toFixed(0)}%</div>
                                            <button type="button" style={{ marginTop: 4 }} onClick={() => setEditSuggestion(null)}>Retirer</button>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        <button onClick={() => saveEdit(id)} disabled={!editTitle.trim()}>Sauver</button>
                                        <button type="button" onClick={() => setEditingId(null)}>Annuler</button>
                                        {AI_ENABLED && <button type="button" onClick={() => fetchEditMetadataSuggestion(t)} disabled={aiLoading || !editTitle.trim()}>AI Statut & Durée</button>}
                                        {aiLoading && <span style={{ fontSize: 12 }}>AI…</span>}
                                    </div>
                                </div>
                            )}
                            {!editing && t.description && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{t.description}</div>}
                            {!editing && t.estimatedMinutes && (
                                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>Estimation: ~{t.estimatedMinutes} min</div>
                            )}
                        </li>
                    );
                })}
                {!tasks.length && <li style={{ padding: 12, fontStyle: 'italic' }}>Aucune tâche.</li>}
            </ul>
        </div>
    );
}
