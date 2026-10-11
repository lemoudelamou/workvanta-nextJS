import type { BoardTask } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/kanban-types";

export function Avatar({
                           assignee,
                       }: {
    assignee: NonNullable<BoardTask["assignee"]>;
}) {
    const label = assignee.name ?? assignee.email;

    if (assignee.image) {
        return (
            <img
                src={assignee.image}
                alt={label}
                title={label}
                className="size-7 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
            />
        );
    }

    const initials = label
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <span
            title={label}
            aria-label={label}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white ring-2 ring-white dark:bg-white dark:text-slate-950 dark:ring-slate-900"
        >
            {initials}
        </span>
    );
}