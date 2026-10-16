import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/task-status";
import { COLUMN_DOTS, idsOf } from "./board-utils";
import { SortableTaskCard } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/sortable-task-card";
import type { BoardTask } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/kanban-types";

export function Column({
                           status,
                           label,
                           tasks,
                           slug,
                           projectId,
                           canEdit,
                           onAdd,
                       }: {
    status: TaskStatus;
    label: string;
    tasks: BoardTask[];
    slug: string;
    projectId: string;
    canEdit: boolean;
    onAdd: (status: TaskStatus) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
        disabled: !canEdit,
    });

    return (
        <section
            aria-label={label}
            className={cn(
                "flex min-h-[320px] flex-col rounded-xl bg-muted/60 p-2 transition-colors",
                isOver && "bg-brand-soft ring-1 ring-brand/30",
            )}
        >
            <header className="flex items-center justify-between px-1.5 pb-2 pt-1">
                <div className="flex items-center gap-2">
                    <span
                        className={cn("size-2 rounded-full", COLUMN_DOTS[status])}
                    />
                    <h3 className="text-[13px] font-semibold text-foreground">{label}</h3>
                    <span className="text-xs tabular-nums text-muted-foreground">{tasks.length}</span>
                </div>

                <div className="flex items-center gap-1.5">
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => onAdd(status)}
                            aria-label={`Add task to ${label}`}
                            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            <Plus className="size-4" />
                        </button>
                    )}
                </div>
            </header>

            <SortableContext
                id={status}
                items={idsOf(tasks)}
                strategy={verticalListSortingStrategy}
            >
                <div ref={setNodeRef} className="flex flex-1 flex-col gap-2">
                    {tasks.map((task) => (
                        <SortableTaskCard
                            key={task.id}
                            task={task}
                            href={`/workspace/${slug}/project/${projectId}/tasks/${task.id}`}
                            canEdit={canEdit}
                        />
                    ))}

                    {tasks.length === 0 && (
                        <p className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                            No tasks
                        </p>
                    )}
                </div>
            </SortableContext>
        </section>
    );
}