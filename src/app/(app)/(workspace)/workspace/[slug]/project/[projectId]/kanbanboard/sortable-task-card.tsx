import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { TaskCard } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/task-card"
import type { BoardTask } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/kanbanboard/kanban-types";

export function SortableTaskCard({
                                     task,
                                     href,
                                     canEdit,
                                 }: {
    task: BoardTask;
    href: string;
    canEdit: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        disabled: !canEdit,
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={cn(isDragging && "opacity-40")}
        >
            <TaskCard
                task={task}
                href={href}
                handle={
                    canEdit ? (
                        <button
                            ref={setActivatorNodeRef}
                            type="button"
                            aria-label={`Drag ${task.title}`}
                            className="mt-0.5 cursor-grab touch-none text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:hover:text-slate-200"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="size-4" />
                        </button>
                    ) : null
                }
            />
        </div>
    );
}