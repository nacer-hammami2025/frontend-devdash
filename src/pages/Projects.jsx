import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import { unwrapList } from '../utils/unwrap';
// Tailwind-based styling replaces custom CSS

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', description: '', deadline: '' });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null); // { id, title, message }

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await API.get('/projects');
      setProjects(unwrapList(response));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/projects', newProject);
      setNewProject({ name: '', description: '', deadline: '' });
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    setConfirm({ id, title: 'Supprimer le projet', message: 'Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.' });
  };

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/projects/${id}`, { status });
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = (id, status) => {
    updateStatus(id, status);
  };

  const safeProjects = Array.isArray(projects) ? projects : [];
  const filtered = safeProjects
    .filter(p => (filter === 'all' ? true : p.status === filter))
    .filter(p => (search ? (p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())) : true));
  if (loading) return <div className="text-sm text-slate-500 p-6">Chargement...</div>;
  if (error) return <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded text-sm text-red-700 m-6">Erreur: {error}</div>;

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Projets</h1>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">Tous</option>
            <option value="active">Actif</option>
            <option value="on_hold">En pause</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>
          <input
            type="text"
            placeholder="Rechercher un projet..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 w-64"
          />
          <button className="px-3 py-2 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Annuler' : 'Nouveau Projet'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-soft mb-6 grid gap-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Nom du projet</label>
            <input
              type="text"
              value={newProject.name}
              onChange={e => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="Nom du projet"
              required
              className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Description</label>
            <textarea
              value={newProject.description}
              onChange={e => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="Description"
              required
              className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 min-h-[88px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date limite</label>
              <input
                type="date"
                value={newProject.deadline}
                onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700"
              />
            </div>
          </div>
          <div>
            <button type="submit" className="px-4 py-2 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white">Créer le projet</button>
          </div>
        </form>
      )}

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(project => (
          <div key={project._id} className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-slate-800">{project.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs ${project.status === 'active'
                ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300'
                : project.status === 'on_hold'
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                  : project.status === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                }`}>
                {project.status === 'active' ? 'Actif' : project.status === 'on_hold' ? 'En pause' : project.status === 'completed' ? 'Terminé' : 'Annulé'}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-3">{project.description}</p>
            <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
              <span>Créé le {new Date(project.createdAt).toLocaleDateString()}</span>
              <span>{project.tasksCount || 0} tâches</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={project.status}
                onChange={e => handleStatusChange(project._id, e.target.value)}
                className="px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 flex-1"
              >
                <option value="active">Actif</option>
                <option value="on_hold">En pause</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
              <button
                className="px-3 py-2 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                Ouvrir
              </button>
              <button onClick={() => handleDelete(project._id)} className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white">Supprimer</button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        variant="danger"
        confirmText="Supprimer"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm?.id) return;
          try {
            await API.delete(`/projects/${confirm.id}`);
            await fetchProjects();
          } catch (err) {
            setError(err.message);
          } finally {
            setConfirm(null);
          }
        }}
      />
    </div>
  );
}
