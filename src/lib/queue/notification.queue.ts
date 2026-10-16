import { Queue } from "bullmq";

import { queueConnection } from "./connection";
import type { MentionJob, TaskAssignedJob, TaskCommentedJob } from "./types";

export const notificationQueue = new Queue("notifications", {
    connection: queueConnection,
});

const defaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
} as const;

function addNotification(name: string, jobId: string, data: object) {
    return notificationQueue.add(name, data, { ...defaultJobOptions, jobId });
}

export function queueTaskAssignedNotification(data: TaskAssignedJob) {
    return addNotification("task-assigned", `task-assigned:${data.taskId}:${data.userId}`, data);
}

export function queueTaskCommentedNotification(data: TaskCommentedJob) {
    return addNotification("task-commented", `task-commented:${data.commentId}:${data.userId}`, data);
}

export function queueMentionNotification(data: MentionJob) {
    return addNotification("mention", `mention:${data.commentId}:${data.userId}`, data);
}