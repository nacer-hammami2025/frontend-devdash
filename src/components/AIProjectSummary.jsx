
export function AIProjectSummary({ summaryDoc, loading, onGenerate, error }) {
    return (
        <div className="card ai-summary">
            <div className="card-header flex space-between">
                <h3>Résumé IA du Projet</h3>
                <button onClick={onGenerate} disabled={loading} className="btn btn-sm">
                    {loading ? 'Génération...' : (summaryDoc ? 'Rafraîchir' : 'Générer')}
                </button>
            </div>
            {error && <div className="error">{error}</div>}
            {!loading && !summaryDoc && !error && <p className="muted">Aucun résumé généré pour l'instant.</p>}
            {summaryDoc && (
                <div className="content">
                    {summaryDoc.summary && <p>{summaryDoc.summary}</p>}
                    <div className="grid-3" style={{ marginTop: '0.75rem' }}>
                        {summaryDoc.highlights?.length > 0 && (
                            <div>
                                <h4>Points forts</h4>
                                <ul>{summaryDoc.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
                            </div>
                        )}
                        {summaryDoc.risks?.length > 0 && (
                            <div>
                                <h4>Risques</h4>
                                <ul>{summaryDoc.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                        )}
                        {summaryDoc.opportunities?.length > 0 && (
                            <div>
                                <h4>Opportunités</h4>
                                <ul>{summaryDoc.opportunities.map((o, i) => <li key={i}>{o}</li>)}</ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
