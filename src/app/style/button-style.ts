import { cn } from "@/lib/utils";

const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const variants = {
    primary: "bg-brand text-white hover:bg-brand-strong dark:text-[#0f1115]",
    secondary:
        "border border-border bg-card text-foreground hover:bg-muted",
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
