import type { TaskStatus } from "@/lib/task-status";

export type BoardTask = {
    id: string;
    title: string;
    status: TaskStatus;
    priority: string;
    dueLabel: string | null;
    overdue: boolean;
    assignee: {
        name: string | null;
        email: string;
        image: string | null;
    } | null;
    subtaskTotal: number;
    subtaskDone: number;
};

export type Columns = Record<TaskStatus, BoardTask[]>;

export type Filters = {
    search: string;
    priority: string;
    status: string;
    assignee: string;
};