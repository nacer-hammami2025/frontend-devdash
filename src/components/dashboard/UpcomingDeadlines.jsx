import { useMemo } from 'react';

export default function UpcomingDeadlines({ projects = [], tasks = [], limit = 6 }) {
    const items = useMemo(() => {
        const now = Date.now();
        const proj = projects.filter(p => p.deadline).map(p => ({
            type: 'project',
            id: p._id || p.id,
            name: p.name,
            deadline: new Date(p.deadline),
            progress: p.progress ?? 0,
            status: p.status
        }));
        const tks = tasks.filter(t => t.deadline || t.dueDate).map(t => ({
            type: 'task',
            id: t._id || t.id,
            name: t.title,
            deadline: new Date(t.deadline || t.dueDate),
            status: t.status,
            priority: t.priority
        }));
        return [...proj, ...tks]
            .filter(i => i.deadline && i.deadline.toString() !== 'Invalid Date')
            .sort((a, b) => a.deadline - b.deadline)
            .slice(0, limit);
    }, [projects, tasks, limit]);

    if (!items.length) {
        return <div className="text-xs text-slate-500">Aucune échéance prochaine.</div>;
    }

    return (
        <ul className="space-y-2">
            {items.map(item => {
                const days = Math.ceil((item.deadline - Date.now()) / (1000 * 60 * 60 * 24));
                const overdue = days < 0;
                const critical = !overdue && days <= 2;
                const soon = !overdue && days <= 5;
                const badge = overdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                    : critical ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : soon ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300';
                return (
                    <li key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 p-2 sm:p-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                {item.type === 'project' ? '🗂️' : '✅'} {item.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {item.deadline.toLocaleDateString()} • {overdue ? 'En retard' : days === 0 ? 'Aujourd\'hui' : `J-${days}`}
                            </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${badge}`}>{overdue ? 'Retard' : days === 0 ? 'Aujourd\'hui' : days + 'j'}</span>
                    </li>
                );
            })}
        </ul>
    );
}
