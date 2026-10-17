import type { BoardTask } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/kanban-types";
import { personColor } from "@/lib/ui/person-color";

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
                className="size-7 shrink-0 rounded-full object-cover ring-2 ring-card"
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
            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-card ${personColor(assignee.email)}`}
        >
            {initials}
        </span>
    );
}