import { useState } from 'react';
import API from '../api';

/**
 * QuickCreate component
 * - Création rapide d'un projet ou d'une tâche sans quitter le dashboard
 * - Minimaliste: champs essentiels, feedback rapide
 */
export default function QuickCreate({ onCreated }) {
    const [mode, setMode] = useState('project'); // 'project' | 'task'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [ok, setOk] = useState(false);

    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const [projectDeadline, setProjectDeadline] = useState('');

    const [taskTitle, setTaskTitle] = useState('');
    const [taskProject, setTaskProject] = useState('');
    const [projects, setProjects] = useState([]);
    const [projectsLoaded, setProjectsLoaded] = useState(false);

    async function ensureProjects() {
        if (projectsLoaded) return;
        try {
            const res = await API.get('/projects');
            const list = Array.isArray(res.data?.data?.items) ? res.data.data.items : (Array.isArray(res.data) ? res.data : []);
            setProjects(list);
            setProjectsLoaded(true);
        } catch (e) {
            // silent
        }
    }

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setOk(false);
        try {
            if (mode === 'project') {
                if (!projectName) throw new Error('Nom du projet requis');
                // Description minimale
                const desc = (projectDesc && projectDesc.trim().length >= 5) ? projectDesc.trim() : `${projectName} – initialisation`;
                // Si l'utilisateur a fourni une date (YYYY-MM-DD) on la convertit en ISO fin de journée pour cohérence
                let deadlineISO;
                if (projectDeadline) {
                    // Construire date locale à minuit + fin de journée (23:59:59) pour inclure la journée complète
                    const d = new Date(projectDeadline + 'T23:59:59');
                    deadlineISO = d.toISOString();
                } else {
                    // Fallback +14 jours si rien saisi
                    deadlineISO = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
                }
                await API.post('/projects', { name: projectName, description: desc, deadline: deadlineISO });
                setProjectName(''); setProjectDesc(''); setProjectDeadline('');
            } else {
                if (!taskTitle || !taskProject) throw new Error('Titre et projet requis');
                const description = `${taskTitle} – description rapide`;
                await API.post('/tasks', { title: taskTitle, project: taskProject, description });
                setTaskTitle(''); setTaskProject('');
            }
            setOk(true);
            if (onCreated) onCreated();
            setTimeout(() => setOk(false), 1800);
        } catch (e) {
            // Surface validation details if present
            const details = e.response?.data?.details;
            if (Array.isArray(details) && details.length) {
                setError(details.map(d => d.message).join(' | '));
            } else {
                setError(e.response?.data?.message || e.message);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMode('project')}
                        className={`text-sm px-3 py-1.5 rounded-md border transition ${mode === 'project' ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'bg-[var(--color-surface)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[var(--color-border)]'}`}
                    >Projet</button>
                    <button
                        onClick={() => { setMode('task'); ensureProjects(); }}
                        className={`text-sm px-3 py-1.5 rounded-md border transition ${mode === 'task' ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'bg-[var(--color-surface)] dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[var(--color-border)]'}`}
                    >Tâche</button>
                </div>
                {ok && <span className="text-xs text-emerald-600">Créé !</span>}
            </div>
            {error && <div className="mb-3 text-xs px-3 py-2 rounded-md bg-rose-50 text-rose-700 border border-rose-200">{error}</div>}
            <form onSubmit={submit} className="grid gap-3">
                {mode === 'project' ? (
                    <>
                        <div>
                            <input
                                placeholder="Nom du projet"
                                className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                                value={projectName}
                                onChange={e => setProjectName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <textarea
                                placeholder="Description"
                                className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm min-h-[60px]"
                                value={projectDesc}
                                onChange={e => setProjectDesc(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="date"
                                className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                                value={projectDeadline}
                                onChange={e => setProjectDeadline(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                            <p className="mt-1 text-[11px] text-slate-500">Date limite (optionnelle). Si vide: +14 jours automatiquement.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <input
                                placeholder="Titre de la tâche"
                                className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                                value={taskTitle}
                                onChange={e => setTaskTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <select
                                className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white text-sm"
                                value={taskProject}
                                onChange={e => setTaskProject(e.target.value)}
                                required
                            >
                                <option value="">Projet...</option>
                                {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </>
                )}
                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 rounded-md bg-[var(--color-accent)] disabled:opacity-60 text-white text-sm hover:bg-[var(--color-accent-hover)]"
                    >{loading ? '...' : 'Créer'}</button>
                </div>
            </form>
        </div>
    );
}
