import type { ReactNode } from "react";

const TONES = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    yellow: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    lime: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
    teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
} as const;

type Props = {
    icon: ReactNode;
    label: string;
    value: string | number;
    helper?: string;
    tone: keyof typeof TONES;
};

export function Kpi({
    icon,
    label,
    value,
    helper,
    tone,
}: Props) {
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

            {helper && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                    {helper}
                </p>
            )}
        </div>
    );
}