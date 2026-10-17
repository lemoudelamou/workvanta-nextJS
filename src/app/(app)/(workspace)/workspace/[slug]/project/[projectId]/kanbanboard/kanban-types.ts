import type { TaskStatus } from "@/lib/task-status";
import type { TaskLabelView } from "@/lib/labels/label-colors";

export type BoardTask = {
    id: string;
    title: string;
    status: TaskStatus;
    priority: string;
    dueLabel: string | null;
    /** ISO due date, used for sorting in the list view. */
    dueAt: string | null;
    overdue: boolean;
    assignee: {
        name: string | null;
        email: string;
        image: string | null;
    } | null;
    subtaskTotal: number;
    subtaskDone: number;
    labels: TaskLabelView[];
};

export type Columns = Record<TaskStatus, BoardTask[]>;

export type Filters = {
    search: string;
    priority: string;
    status: string;
    assignee: string;
    /** A label id, or "ALL". */
    label: string;
};