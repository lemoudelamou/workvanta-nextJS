export function getNotificationText(type: string) {
    switch (type) {
        case "TASK_ASSIGNED":
            return "You were assigned a task.";
        case "TASK_COMMENTED":
            return "Someone commented on a task you're involved with.";
        case "MENTION":
            return "You were mentioned in a comment.";
        case "PROJECT_UPDATED":
            return "A project you're involved with was updated.";
        case "INVITATION":
            return "You received a workspace invitation.";
        default:
            return "You have a new notification.";
    }
}

export function getTaskUrl(data: unknown) {
    if (!data || typeof data !== "object") return null;

    const value = data as {
        taskId?: unknown;
        projectId?: unknown;
        workspaceSlug?: unknown;
    };

    if (
        typeof value.taskId !== "string" ||
        typeof value.projectId !== "string" ||
        typeof value.workspaceSlug !== "string"
    ) {
        return null;
    }

    return `/workspace/${value.workspaceSlug}/project/${value.projectId}/tasks/${value.taskId}`;
}