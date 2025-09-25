import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import API from '../api';
import { unwrapList, unwrapSingle } from '../utils/unwrap';

export default function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskLoading, setTaskLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await API.get(`/projects/${id}`);
                const proj = unwrapSingle(res);
                setProject(proj);
                // Charger tâches liées
                try {
                    const tasksResp = await API.get(`/tasks?projectId=${id}`);
                    setTasks(unwrapList(tasksResp));
                } catch { /* silencieux */ }
            } catch (err) {
                setError(err?.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    async function createTask(e) {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        setTaskLoading(true);
        try {
            const resp = await API.post('/tasks', { title: taskTitle.trim(), project: id, description: taskTitle.trim() });
            // Ajouter la tâche en tête
            setTasks(prev => [{ ...(unwrapSingle(resp) || resp.data?.data || resp.data), title: taskTitle.trim() }, ...prev]);
            setTaskTitle('');
        } catch (e) {
            alert(e.response?.data?.message || e.message);
        } finally {
            setTaskLoading(false);
        }
    }

    if (loading) return <div className="p-6 text-sm text-slate-500">Chargement…</div>;
    if (error) return <div className="m-6 bg-rose-50 border border-rose-200 text-rose-700 rounded p-4">Erreur: {error}</div>;
    if (!project) return <div className="p-6 text-sm text-slate-500">Projet introuvable.</div>;

    const statusClasses =
        project.status === 'active'
            ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300'
            : project.status === 'on_hold'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                : project.status === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200';

    return (
        <div className="max-w-[1000px] mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-slate-200">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClasses}`}>{project.status === 'active' ? 'Actif' : project.status === 'on_hold' ? 'En pause' : project.status === 'completed' ? 'Terminé' : 'Annulé'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">Retour</button>
                    <Link to="/projects" className="px-3 py-2 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white">Tous les projets</Link>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-soft mb-6">
                <h2 className="text-sm font-semibold text-slate-600 mb-2">Description</h2>
                <p className="text-slate-700 mb-4">{project.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-slate-500">Date limite</div>
                        <div className="text-slate-800 font-medium">{project.deadline ? new Date(project.deadline).toLocaleDateString() : '—'}</div>
                    </div>
                    <div>
                        <div className="text-slate-500">Créé le</div>
                        <div className="text-slate-800 font-medium">{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-soft mb-6">
                <h2 className="text-sm font-semibold text-slate-600 mb-4">Créer une tâche rapide</h2>
                <form onSubmit={createTask} className="flex flex-col sm:flex-row gap-3">
                    <input
                        value={taskTitle}
                        onChange={e => setTaskTitle(e.target.value)}
                        placeholder="Titre de la tâche"
                        className="flex-1 px-3 py-2 rounded-md border border-slate-200"
                    />
                    <button
                        type="submit"
                        disabled={taskLoading || !taskTitle.trim()}
                        className="px-4 py-2 rounded-md bg-[var(--color-accent)] text-white disabled:opacity-60 hover:bg-[var(--color-accent-hover)]"
                    >{taskLoading ? 'Création…' : 'Ajouter'}</button>
                </form>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-soft">
                <h2 className="text-sm font-semibold text-slate-600 mb-4">Tâches ({tasks.length})</h2>
                {tasks.length === 0 && <div className="text-sm text-slate-500">Aucune tâche pour l'instant.</div>}
                <div className="grid gap-3">
                    {tasks.map(t => (
                        <div key={t._id || t.id} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-slate-800 text-sm">{t.title}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'done'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : t.status === 'in_progress' || t.status === 'doing'
                                        ? 'bg-sky-100 text-sky-700'
                                        : t.status === 'in_review'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-slate-100 text-slate-700'
                                    }`}>{t.status === 'done' ? 'Terminée' : (t.status === 'in_progress' || t.status === 'doing') ? 'En cours' : t.status === 'in_review' ? 'En revue' : 'À faire'}</span>
                            </div>
                            {t.description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{t.description}</p>}
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</span>
                                {t.deadline && <span>Échéance: {new Date(t.deadline).toLocaleDateString()}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
