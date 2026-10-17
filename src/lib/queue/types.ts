export type TaskAssignedJob = {
    userId: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    assignedBy: string;
};

export type TaskCommentedJob = {
    userId: string;
    taskId: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    commentId: string;
    commentedBy: string;
};

/** A task was just marked done; tell whoever was waiting on it. */
export type TaskDoneJob = {
    taskId: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    completedBy: string;
    /** ISO time it was done, so finishing it again later counts as new. */
    completedAt: string;
};

export type MentionJob = {
    userId: string;
    taskId: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    commentId: string;
    mentionedBy: string;
};