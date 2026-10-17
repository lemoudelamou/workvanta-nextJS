/** A small ring that fills with the share of work done. */
export function ProgressRing({ value, size = 36, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, value));
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-foreground/10" />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - clamped / 100)}
                className={`${clamped === 100 ? "stroke-status-done" : "stroke-brand"} transition-[stroke-dashoffset] duration-700`}
            />
        </svg>
    );
}
