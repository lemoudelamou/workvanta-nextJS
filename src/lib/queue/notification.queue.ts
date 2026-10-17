import { Queue } from "bullmq";

import { queueConnection } from "./connection";
import type { MentionJob, TaskAssignedJob, TaskCommentedJob, TaskDoneJob } from "./types";

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

export function queueTaskDoneNotifications(data: TaskDoneJob) {
    return addNotification("task-done", `task-done:${data.taskId}:${data.completedAt}`, data);
}

/**
 * Best effort: a task that's done stays done even if the queue is
 * unreachable; only the "you're unblocked" notices are lost.
 */
export async function notifyTaskDone(data: Omit<TaskDoneJob, "completedAt">) {
    try {
        await queueTaskDoneNotifications({ ...data, completedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Couldn't queue unblocked notifications:", error);
    }
}

export function queueMentionNotification(data: MentionJob) {
    return addNotification("mention", `mention:${data.commentId}:${data.userId}`, data);
}