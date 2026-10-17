import { cn } from "@/lib/utils";

export function IconBadge({ children, solid, className }: { children: React.ReactNode; solid?: boolean; className?: string }) {
    return (
        <span
            className={cn(
                "flex size-11 items-center justify-center rounded-xl [&>svg]:size-5",
                solid
                    ? "bg-brand text-white dark:text-[#0f1115]"
                    : "bg-brand-soft text-brand dark:bg-brand/15",
                className,
            )}
        >
            {children}
        </span>
    );
}