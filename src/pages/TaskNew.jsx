import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { createTask } from '../api';
import TaskAISubtasks from '../components/TaskAISubtasks';
import TaskAISuggestion from '../components/TaskAISuggestion';
import { cacheTasks } from '../offline/db';

export default function TaskNew() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await API.get('/projects');
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (mounted) setProjects(list);
      } catch (e) {
        console.warn('Failed to load projects', e.message);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !project) {
      setError('Titre et projet requis');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await createTask({ title, description, project });
      if (created?.offline) {
        setSuccess(true);
        setTimeout(() => navigate('/'), 800);
      } else {
        // Cache the created task for offline availability
        try { await cacheTasks([created]); } catch { }
        setSuccess(true);
        setTimeout(() => navigate('/'), 600);
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Nouvelle Tâche</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600 }}>Titre *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de la tâche" required style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600 }}>Projet *</label>
          <select value={project} onChange={e => setProject(e.target.value)} required style={{ width: '100%' }}>
            <option value="">-- Choisir --</option>
            {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontWeight: 600 }}>Description</label>
            <TaskAISuggestion
              title={title}
              description={description}
              onApply={(suggestion) => setDescription(prev => prev ? prev + '\n\n' + suggestion : suggestion)}
            />
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} placeholder="Description (optionnel)" style={{ width: '100%', fontFamily: 'inherit' }} />
          <TaskAISubtasks
            title={title}
            description={description}
            projectName={projects.find(p => (p._id || p.id) === project)?.name}
            onAppend={(text) => setDescription(prev => prev ? prev + '\n' + text : text)}
          />
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {success && <div style={{ color: 'green' }}>Créé{navigator.onLine ? '' : ' (en attente de synchronisation)'} !</div>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={submitting || !title || !project}>{submitting ? 'En cours…' : 'Créer'}</button>
          <button type="button" onClick={() => navigate(-1)}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
