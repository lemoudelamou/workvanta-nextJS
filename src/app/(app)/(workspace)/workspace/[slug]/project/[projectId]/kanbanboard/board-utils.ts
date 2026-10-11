import { TASK_STATUSES, isTaskStatus, type TaskStatus } from "@/lib/task-status";
import type { BoardTask, Columns } from "./kanban-types";

export const COLUMN_DOTS: Record<TaskStatus, string> = {
    TODO: "bg-slate-400",
    IN_PROGRESS: "bg-blue-500",
    IN_REVIEW: "bg-amber-500",
    DONE: "bg-emerald-500",
};

export function groupTasks(tasks: BoardTask[]): Columns {
    const columns = Object.fromEntries(
        TASK_STATUSES.map((status) => [status, [] as BoardTask[]]),
    ) as Columns;

    for (const task of tasks) {
        columns[task.status].push(task);
    }

    return columns;
}

export function findColumn(columns: Columns, id: string): TaskStatus | null {
    if (isTaskStatus(id)) return id;

    for (const status of TASK_STATUSES) {
        if (columns[status].some((task) => task.id === id)) {
            return status;
        }
    }

    return null;
}

export const idsOf = (list: BoardTask[]) => list.map((task) => task.id);