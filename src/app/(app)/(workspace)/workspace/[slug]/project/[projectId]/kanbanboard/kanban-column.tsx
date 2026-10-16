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
                "flex min-h-[320px] flex-col rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 transition-colors dark:border-white/10 dark:bg-white/[0.03]",
                isOver &&
                "border-violet-300 bg-violet-50/60 dark:border-violet-400/40 dark:bg-violet-500/[0.06]",
            )}
        >
            <header className="flex items-center justify-between px-1 pb-3">
                <div className="flex items-center gap-2">
                    <span
                        className={cn("size-2 rounded-full", COLUMN_DOTS[status])}
                    />
                    <h3 className="text-sm font-semibold">{label}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">
                        {tasks.length}
                    </span>

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => onAdd(status)}
                            aria-label={`Add task to ${label}`}
                            className="flex size-6 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
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
                        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-white/10">
                            No tasks
                        </p>
                    )}
                </div>
            </SortableContext>
        </section>
    );
}