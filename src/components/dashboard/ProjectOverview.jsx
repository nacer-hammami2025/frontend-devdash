import ProjectMiniCard from './ProjectMiniCard';

export default function ProjectOverview({ projects = [], max = 6, onFocus, focusedId }) {
    if (!projects.length) return <div className="text-xs text-slate-500">Aucun projet.</div>;
    const sorted = [...projects]
        .sort((a, b) => (b.progress || 0) - (a.progress || 0))
        .slice(0, max);
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
            {sorted.map(p => (
                <ProjectMiniCard
                    key={p._id || p.id}
                    project={p}
                    onFocus={onFocus}
                    focused={focusedId === (p._id || p.id)}
                />
            ))}
        </div>
    );
}
