export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_COLUMNS: { status: TaskStatus; label: string }[] = [
    { status: "TODO", label: "To do" },
    { status: "IN_PROGRESS", label: "In progress" },
    { status: "IN_REVIEW", label: "In review" },
    { status: "DONE", label: "Done" },
];

export const PRIORITY_META = {
    LOW: { label: "Low" },
    MEDIUM: { label: "Medium" },
    HIGH: { label: "High" },
    URGENT: { label: "Urgent" },
} as const;

export function isTaskStatus(value: unknown): value is TaskStatus {
    return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

