import Sparkline from '../Sparkline';

/**
 * MetricCard – carte KPI moderne avec accent visuel.
 * Props:
 *  - icon: ReactNode
 *  - label: string
 *  - value: string|number
 *  - sub: string (optionnel)
 *  - trend: number[] (optionnel sparkline)
 *  - variant: 'primary'|'success'|'warning'|'danger'|'neutral'
 *  - delta: { value: number, direction: 'up'|'down' } (optionnel)
 */
const colorMap = {
    primary: {
        ring: 'from-[var(--color-accent)]/25 via-[var(--color-accent)]/5 to-transparent',
        icon: 'text-[var(--color-accent)]',
        value: 'text-slate-900 dark:text-slate-50'
    },
    success: {
        ring: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
        icon: 'text-emerald-600',
        value: 'text-slate-900 dark:text-slate-50'
    },
    warning: {
        ring: 'from-amber-500/20 via-amber-500/5 to-transparent',
        icon: 'text-amber-600',
        value: 'text-slate-900 dark:text-slate-50'
    },
    danger: {
        ring: 'from-rose-500/20 via-rose-500/5 to-transparent',
        icon: 'text-rose-600',
        value: 'text-slate-900 dark:text-slate-50'
    },
    neutral: {
        ring: 'from-slate-500/15 via-slate-500/5 to-transparent',
        icon: 'text-slate-600',
        value: 'text-slate-900 dark:text-slate-50'
    }
};

export default function MetricCard({ icon, label, value, sub, trend, variant = 'primary', delta }) {
    const colors = colorMap[variant] || colorMap.primary;
    return (
        <div className="relative group overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm p-5 sm:p-5 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${colors.ring} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
            <div className="relative flex items-start justify-between gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 ${colors.icon} shadow-inner ring-1 ring-inset ring-white/30 dark:ring-slate-700/50`}>{icon}</div>
                {trend && trend.length > 0 && (
                    <div className="w-24 h-10 -mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Sparkline data={trend} width={96} height={40} strokeWidth={2} stroke="#6366f1" />
                    </div>
                )}
            </div>
            <div className="mt-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
                <div className={`mt-1 text-3xl font-semibold leading-tight ${colors.value}`}>{value}</div>
                <div className="mt-1 flex items-center gap-2">
                    {delta && (
                        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${delta.direction === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                            {delta.direction === 'up' ? '▲' : '▼'} {delta.value}%
                        </span>
                    )}
                    {sub && <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</span>}
                </div>
            </div>
        </div>
    );
}
