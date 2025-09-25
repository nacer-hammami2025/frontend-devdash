import ProgressRing from './ProgressRing';

export default function ProjectMiniCard({ project, onFocus, focused }) {
    const deadline = project.deadline ? new Date(project.deadline) : null;
    const daysLeft = deadline ? Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const statusColor = project.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : project.status === 'on_hold' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            : project.status === 'cancelled' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
    const risk = daysLeft !== null && project.progress < 100 && daysLeft < 0;
    const id = project._id || project.id;
    return (
        <div
            className={`group relative flex flex-col rounded-xl border ${focused ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/40' : 'border-slate-200/70 dark:border-slate-700/60'} bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm p-4 sm:p-4 p-3 hover:shadow-md hover:-translate-y-0.5 transition-all`}
            onClick={() => onFocus && onFocus(id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFocus && onFocus(id); } }}
            aria-pressed={focused ? 'true' : 'false'}
            aria-label={`Projet ${project.name} ${focused ? 'sélectionné' : ''}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={project.name}>{project.name}</h4>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className={`px-2 py-0.5 rounded-full ${statusColor} font-medium`}>{project.status}</span>
                        {daysLeft !== null && (
                            <span className={`px-2 py-0.5 rounded-full font-medium ${risk ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : daysLeft <= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300'}`}>{risk ? 'En retard' : daysLeft <= 3 ? `J-${daysLeft}` : `J-${daysLeft}`}</span>
                        )}
                        {typeof project.taskCount === 'number' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-medium">{project.taskCount} tâches</span>
                        )}
                    </div>
                </div>
                <ProgressRing value={project.progress ?? 0} size={56} stroke={5} color={risk ? '#dc2626' : '#6366f1'} />
            </div>
            {project.description && (
                <p className="mt-3 text-xs leading-snug line-clamp-3 text-slate-600 dark:text-slate-400">{project.description}</p>
            )}
            <div className="mt-4 flex gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); window.location.assign(`/projects/${id}`); }}
                    className="inline-flex items-center justify-center text-xs px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50"
                >Ouvrir</button>
                {onFocus && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onFocus(id); }}
                        className="inline-flex items-center justify-center text-xs px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >Focus</button>
                )}
            </div>
        </div>
    );
}
