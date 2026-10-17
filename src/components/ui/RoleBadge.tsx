import { cn } from "@/lib/utils";

export function RoleBadge({ role, className }: { role: string; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
                className,
            )}
        >
            {role.charAt(0) + role.slice(1).toLowerCase()}
        </span>
    );
}