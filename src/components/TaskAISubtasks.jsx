import PropTypes from 'prop-types';
import { useState } from 'react';
import { useAI } from '../hooks/useAI';

export default function TaskAISubtasks({ title, description, projectName, onAppend }) {
  const { AI_ENABLED, suggestSubtasks, loading } = useAI();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [max, setMax] = useState(6);

  if (!AI_ENABLED) return null;

  const handleGenerate = async () => {
    setError(null);
    const res = await suggestSubtasks({ title, description, projectName, max });
    if (res?.error) { setError(res.error); return; }
    setItems(res.subtasks || []);
    setExpanded(true);
  };

  const handleAppendAll = () => {
    if (!items.length) return;
    const bulletList = items.map(s => `- ${s.title}${s.estimatedHours ? ` (~${s.estimatedHours}h)` : ''}: ${s.rationale}`).join('\n');
    onAppend && onAppend(`\nSubtasks:\n${bulletList}\n`);
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 6, marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>AI Subtasks</strong>
        <input
          type="number"
          min={2}
          max={12}
          value={max}
          onChange={e => setMax(e.target.value)}
          style={{ width: 60 }}
          title="Nombre de sous-tâches"
        />
        <button type="button" onClick={handleGenerate} disabled={loading || !title} style={{ padding: '0.4rem 0.7rem' }}>
          {loading ? '...' : 'Générer'}
        </button>
        {items.length > 0 && (
          <>
            <button type="button" onClick={() => setExpanded(x => !x)} style={{ padding: '0.3rem 0.6rem' }}>
              {expanded ? 'Masquer' : 'Afficher'} ({items.length})
            </button>
            <button type="button" onClick={handleAppendAll} style={{ padding: '0.3rem 0.6rem' }}>
              Ajouter à la description
            </button>
          </>
        )}
      </div>
      {error && <div style={{ color: 'red', marginTop: 6 }}>{error}</div>}
      {expanded && items.length > 0 && (
        <ol style={{ marginTop: 8, paddingLeft: '1.1rem' }}>
          {items.map((s, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              <div style={{ fontWeight: 500 }}>{s.title} {s.estimatedHours ? <span style={{ fontSize: '0.75rem', color: '#555' }}> (~{s.estimatedHours}h)</span> : null}</div>
              <div style={{ fontSize: '0.75rem', color: '#444' }}>{s.rationale}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

TaskAISubtasks.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  projectName: PropTypes.string,
  onAppend: PropTypes.func
};
