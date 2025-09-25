
function iconFor(action = '') {
    if (action.startsWith('auth.')) return '🔐';
    if (action.startsWith('security.')) return '🛡️';
    if (action.startsWith('project.')) return '📁';
    if (action.startsWith('task.')) return '✅';
    return '📌';
}

function timeAgo(date) {
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}j`;
}

export default function RecentActivity({ items = [] }) {
    if (!items.length) {
        return <div className="text-sm text-slate-500">Aucune activité récente</div>;
    }
    return (
        <ul className="divide-y divide-slate-100">
            {items.map((a) => (
                <li key={a.id} className="py-3 flex items-start gap-3">
                    <div className="text-xl leading-none">{iconFor(a.action)}</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800">
                            <span className="font-medium">{a.user?.name || a.user?.email || 'Système'}</span>
                            <span className="text-slate-400"> • </span>
                            <span>{a.details || a.action}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{new Date(a.createdAt).toLocaleString()} • il y a {timeAgo(a.createdAt)}</div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

