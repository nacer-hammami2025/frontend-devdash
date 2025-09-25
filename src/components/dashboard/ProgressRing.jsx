
/**
 * ProgressRing – anneau de progression accessible.
 * Props: value (0-100), size, stroke, color.
 */
export default function ProgressRing({ value = 0, size = 64, stroke = 6, color = '#6366f1', bg = 'rgba(148,163,184,0.25)' }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, value));
    const offset = circumference - (clamped / 100) * circumference;
    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} aria-label={`Progression ${clamped}%`}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    stroke={bg}
                    fill="transparent"
                    strokeWidth={stroke}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    stroke={color}
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeWidth={stroke}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <span className="absolute text-xs font-semibold text-slate-700 dark:text-slate-200">{clamped}%</span>
        </div>
    );
}
