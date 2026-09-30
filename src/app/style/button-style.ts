import { cn } from "@/lib/utils";

const base =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition";

const variants = {
    primary:
        "bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-sm dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
    secondary:
        "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
    danger:
        "border border-rose-500/25 bg-rose-500/[0.06] text-rose-600 hover:-translate-y-0.5 hover:border-rose-500/40 hover:bg-rose-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 dark:text-rose-300",
} as const;

const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-10 px-4",
    lg: "h-11 px-4",
} as const;

export function buttonStyles({
    variant = "primary",
    size = "md",
    className,
}: {
    variant?: keyof typeof variants;
    size?: keyof typeof sizes;
    className?: string;
} = {}) {
    return cn(base, variants[variant], sizes[size], className);
}