
export function AITaskSuggestions({ suggestionsDoc, loading, onGenerate, error }) {
    return (
        <div className="card ai-suggestions" style={{ marginTop: '1rem' }}>
            <div className="card-header flex space-between">
                <h3>Suggestions IA</h3>
                <button onClick={onGenerate} disabled={loading} className="btn btn-sm">
                    {loading ? 'Génération...' : (suggestionsDoc ? 'Rafraîchir' : 'Générer')}
                </button>
            </div>
            {error && <div className="error">{error}</div>}
            {!loading && !suggestionsDoc && !error && <p className="muted">Aucune suggestion disponible.</p>}
            {suggestionsDoc?.suggestions?.length > 0 && (
                <ul className="suggestions-list" style={{ marginTop: '0.75rem' }}>
                    {suggestionsDoc.suggestions.map((s, i) => (
                        <li key={i} className="suggestion-item">
                            <div className="title-row">
                                <strong>{s.title}</strong>
                                {s.priority && <span className={`badge priority-${s.priority}`}>{s.priority}</span>}
                            </div>
                            {s.description && <p className="desc">{s.description}</p>}
                            <div className="meta-line">
                                {s.impact && <span className="pill">Impact: {s.impact}</span>}
                                {s.effort && <span className="pill">Effort: {s.effort}</span>}
                            </div>
                            {s.rationale && <p className="rationale"><em>{s.rationale}</em></p>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
