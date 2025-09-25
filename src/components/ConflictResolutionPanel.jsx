import { useMemo, useState } from 'react';
import { useConflicts } from '../hooks/useConflicts';

// Utility diff helper (very simple line-wise JSON stringify diff)
function computeDiff(serverVersion, clientVersion) {
    try {
        const s = JSON.stringify(serverVersion || {}, null, 2).split('\n');
        const c = JSON.stringify(clientVersion || {}, null, 2).split('\n');
        const max = Math.max(s.length, c.length);
        const rows = [];
        for (let i = 0; i < max; i++) {
            rows.push({
                left: s[i] || '',
                right: c[i] || '',
                changed: (s[i] || '') !== (c[i] || '')
            });
        }
        return rows;
    } catch {
        return [];
    }
}

export function ConflictResolutionPanel({ title = 'Offline Conflicts', limit = 50, compact = false, autoHide = false }) {
    const { conflicts, loading, isShim, markResolved, clearResolved, purgeAll, applyServer, replayClient, manualMerge, refresh } = useConflicts({ enabled: true });
    const [showResolved, setShowResolved] = useState(false);
    const [mergeOpenId, setMergeOpenId] = useState(null);
    const [mergeDraft, setMergeDraft] = useState('');
    const visible = useMemo(() => conflicts
        .filter(c => showResolved || !c.resolved)
        .slice(0, limit), [conflicts, showResolved, limit]);

    const anyResolved = conflicts.some(c => c.resolved);
    const anyConflicts = conflicts.length > 0;

    if (autoHide && isShim && !anyConflicts && !loading) {
        return null; // masquer complètement si pas de support offline et aucun conflit
    }

    return (
        <div style={{ border: '1px solid #444', padding: '0.75rem', borderRadius: 8, background: '#1e1e1e', fontSize: compact ? '0.8rem' : '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{title} {anyConflicts ? `(${visible.length}${showResolved ? '' : ` / ${conflicts.filter(c => !c.resolved).length} unresolved`})` : ''}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={refresh} title="Refresh conflicts" disabled={isShim}>↻</button>
                    {anyConflicts && (
                        <button onClick={() => setShowResolved(s => !s)}>{showResolved ? 'Hide Resolved' : 'Show Resolved'}</button>
                    )}
                    <button onClick={clearResolved} disabled={!anyResolved}>Clear Resolved</button>
                    <button onClick={purgeAll} disabled={!anyConflicts} style={{ color: anyConflicts ? '#ffb3b3' : '#666' }}>Purge All</button>
                </div>
            </div>
            {isShim && !anyConflicts && (
                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: 6 }}>
                    Offline sync inactif (mode simplifié) – ce panneau est caché automatiquement quand inutilisé.
                </div>
            )}
            {loading && <div>Loading conflicts…</div>}
            {!loading && visible.length === 0 && <div style={{ opacity: 0.7 }}>No conflicts 🎉</div>}
            {!loading && visible.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {visible.map(c => {
                        const diffRows = computeDiff(c.server, c.client);
                        const open = mergeOpenId === c.id;
                        return (
                            <li key={c.id} style={{ border: '1px solid #333', padding: '0.5rem', borderRadius: 6, background: c.resolved ? '#1b3320' : '#2a1e1e' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        <strong>{c.entity}</strong> <code>{c.entityId || c.id}</code> – reason: <em>{c.reason}</em>
                                        {c.resolved && <span style={{ marginLeft: 8, color: '#8fd48f' }}>RESOLVED</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {!c.resolved && !open && (
                                            <>
                                                {c.serverData && <button onClick={() => applyServer(c)}>Appliquer serveur</button>}
                                                {c.originalData && <button onClick={() => replayClient(c)}>Rejouer client</button>}
                                                <button onClick={() => { setMergeOpenId(c.id); setMergeDraft(JSON.stringify({ ...(c.serverData || {}), ...(c.clientData || {}) }, null, 2)); }}>Fusionner…</button>
                                                <button onClick={() => markResolved(c.id)}>Marquer résolu</button>
                                            </>
                                        )}
                                        {open && !c.resolved && (
                                            <button onClick={() => { setMergeOpenId(null); setMergeDraft(''); }}>Annuler fusion</button>
                                        )}
                                    </div>
                                </div>
                                {(diffRows.length > 0) && !compact && !open && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, maxHeight: 200, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.7rem', lineHeight: 1.2 }}>
                                        <div style={{ borderRight: '1px solid #444', paddingRight: 4 }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Server</div>
                                            {diffRows.map((r, i) => <div key={i} style={{ background: r.changed ? '#3a2d2d' : 'transparent' }}>{r.left}</div>)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Client</div>
                                            {diffRows.map((r, i) => <div key={i} style={{ background: r.changed ? '#2d3a31' : 'transparent' }}>{r.right}</div>)}
                                        </div>
                                    </div>
                                )}
                                {open && !c.resolved && (
                                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Éditez le JSON fusionné (doit être valide) :</div>
                                        <textarea rows={8} style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.7rem' }} value={mergeDraft} onChange={e => setMergeDraft(e.target.value)} />
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => {
                                                try {
                                                    const parsed = JSON.parse(mergeDraft);
                                                    manualMerge(c, parsed);
                                                    setMergeOpenId(null);
                                                    setMergeDraft('');
                                                } catch (err) {
                                                    alert('JSON invalide: ' + err.message);
                                                }
                                            }}>Appliquer fusion</button>
                                            <button onClick={() => { setMergeOpenId(null); setMergeDraft(''); }}>Annuler</button>
                                        </div>
                                    </div>
                                )}
                                <div style={{ marginTop: 4, opacity: 0.6, fontSize: '0.65rem' }}>created {new Date(c.createdAt).toLocaleTimeString()} {c.serverVersion != null && c.clientVersion != null && `(server v${c.serverVersion} / client v${c.clientVersion})`}</div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default ConflictResolutionPanel;
