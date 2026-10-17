import { cn } from "@/lib/utils";

const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
    // A soft top highlight and a tight shadow give the primary action some
    // weight without a loud gradient.
    primary:
        "bg-brand bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0)_60%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(42,33,150,0.35),0_0_0_1px_rgba(42,33,150,0.25)] hover:bg-brand-strong active:translate-y-px dark:text-[#0f1115] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
    secondary:
        "border border-border bg-card text-foreground shadow-[0_1px_2px_rgba(23,26,33,0.05)] hover:border-foreground/20 hover:bg-muted/60 active:translate-y-px",
    danger:
        "border border-danger/30 bg-card text-danger hover:border-danger/50 hover:bg-danger/[0.06]",
} as const;

const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-3.5",
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
