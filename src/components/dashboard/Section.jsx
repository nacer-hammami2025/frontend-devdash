
export default function Section({ title, icon, actions, children, className = '' }) {
    return (
        <section className={`relative rounded-2xl border border-slate-200/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm p-5 sm:p-5 px-4 py-4 ${className}`}>
            <div className="flex items-start justify-between mb-4 sm:mb-4 mb-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
                    {title}
                </h3>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
            {children}
        </section>
    );
}
