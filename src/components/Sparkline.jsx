export default function Sparkline({ data = [], width = 120, height = 36, stroke = '#0ea5e9', fill = 'transparent', strokeWidth = 2 }) {
    if (!data || data.length === 0) {
        data = [0];
    }
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const stepX = data.length > 1 ? (width - 4) / (data.length - 1) : 0;
    const points = data.map((v, i) => {
        const x = 2 + i * stepX;
        const y = height - 2 - ((v - min) / range) * (height - 4);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
            {fill !== 'transparent' && (
                <polyline
                    points={`${points} ${width - 2},${height - 2} 2,${height - 2}`}
                    fill={fill}
                    stroke="none"
                />
            )}
            <polyline
                points={points}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
