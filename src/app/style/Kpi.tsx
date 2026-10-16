import type { ReactNode } from "react";

type Tone = "blue" | "violet" | "amber" | "green" | "red" | "orange" | "slate" | (string & {});

type Props = {
    /** Kept for compatibility; stats are text-only now. */
    icon?: ReactNode;
    label: string;
    value: string | number;
    helper?: string;
    /** Only "red" is shown (for values that need attention). */
    tone?: Tone;
};

export function Kpi({ label, value, helper, tone }: Props) {
    const alert = tone === "red";

    return (
        <div className="bg-card px-5 py-4">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div
                className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${
                    alert ? "text-danger" : "text-foreground"
                }`}
            >
                {value}
            </div>
            {helper && <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p>}
        </div>
    );
}
