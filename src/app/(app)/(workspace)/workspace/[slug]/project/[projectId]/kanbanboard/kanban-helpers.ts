import { PRIORITY_META, TASK_COLUMNS } from "@/lib/task-status";

export function getPriorityLabel(priority: string) {
    const meta = PRIORITY_META[priority as keyof typeof PRIORITY_META];

    return meta?.label ?? priority;
}

export function getStatusLabel(status: string) {
    const column = TASK_COLUMNS.find((item) => item.status === status);

    return column?.label ?? status;
}

export function getAssigneeLabel(
    email: string,
    assignees: {
        email: string;
        name: string | null;
    }[],
) {
    const assignee = assignees.find((item) => item.email === email);

    return assignee?.name ?? email;
}