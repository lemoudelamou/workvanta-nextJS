import { cn } from "@/lib/utils";

export function RoleBadge({ role, className }: { role: string; className?: string }) {
    return (
        <span
            className={cn(
                "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600 dark:bg-white/[0.08] dark:text-slate-300",
                className,
            )}
        >
            {role.toLowerCase()}
        </span>
    );
}