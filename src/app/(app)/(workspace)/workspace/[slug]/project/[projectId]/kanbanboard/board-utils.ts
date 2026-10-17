import { TASK_STATUSES, isTaskStatus, type TaskStatus } from "@/lib/task-status";
import type { BoardTask, Columns } from "./kanban-types";

export const COLUMN_DOTS: Record<TaskStatus, string> = {
    TODO: "bg-status-todo",
    IN_PROGRESS: "bg-status-progress",
    IN_REVIEW: "bg-status-review",
    DONE: "bg-status-done",
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