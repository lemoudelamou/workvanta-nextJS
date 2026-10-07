import { cn } from "@/lib/utils";

export function IconBadge({ children, solid, className }: { children: React.ReactNode; solid?: boolean; className?: string }) {
    return (
        <span
            className={cn(
                "flex size-11 items-center justify-center rounded-xl [&>svg]:size-5",
                solid
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                    : "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
                className,
            )}
        >
            {children}
        </span>
    );
}