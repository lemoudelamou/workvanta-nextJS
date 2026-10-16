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

export type MentionJob = {
    userId: string;
    taskId: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    commentId: string;
    mentionedBy: string;
};