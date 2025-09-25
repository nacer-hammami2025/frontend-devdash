import { useState } from 'react';
import { useAI } from '../hooks/useAI';

export default function TaskAISuggestion({ title, description, onApply, className }) {
  const { AI_ENABLED, loading, suggestTaskDescription } = useAI();
  const [error, setError] = useState(null);
  const [usedOnce, setUsedOnce] = useState(false);

  if (!AI_ENABLED) return null;

  const handleSuggest = async () => {
    if (!title) {
      setError('Titre requis pour suggestion');
      return;
    }
    setError(null);
    const res = await suggestTaskDescription({ title, existingDescription: description });
    if (res?.error) {
      setError(res.error);
      return;
    }
    if (res?.suggestion) {
      onApply(res.suggestion);
      setUsedOnce(true);
    }
  };

  return (
    <div className={className} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" onClick={handleSuggest} disabled={loading || !title} className="ai-suggest-btn">
        {loading ? 'IA…' : (usedOnce ? 'Regénérer IA' : 'Suggestion IA')}
      </button>
      {error && <span style={{ color: 'red', fontSize: '0.8rem' }}>{error}</span>}
    </div>
  );
}
