const TONES = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

export function Kpi({
    icon,
    label,
    value,
    helper,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    helper?: string;
    tone: keyof typeof TONES;
}) {
    return (
        <div className="bg-card p-6">
            <div className="flex items-center gap-3">
                <span
                    aria-hidden="true"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl [&>svg]:size-[18px] ${TONES[tone]}`}
                >
                    {icon}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                    {label}
                </span>
            </div>
            <div className="mt-5 text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {value}
            </div>
            {helper ? (
                <p className="mt-1.5 text-sm text-muted-foreground">{helper}</p>
            ) : null}
        </div>
    );
}