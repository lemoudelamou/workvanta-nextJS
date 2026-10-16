import { Worker, type Job } from "bullmq";

import { queueConnection } from "../../queue/connection";
import { prisma } from "@/lib/db/prisma-client";
import { createNotification, sendNotificationEmailIfEnabled } from "@/lib/notifications/create-notification";
import { sendMentionEmail, sendTaskAssignmentEmail, sendTaskCommentedEmail } from "@/lib/email/mailer";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";
import type { MentionJob, TaskAssignedJob, TaskCommentedJob } from "../../queue/types";

type NotificationInput = Parameters<typeof createNotification>[0];

async function getDisplayName(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
    });

    return user?.name?.trim() || user?.email || "Someone";
}

type DeliverInput = {
    userId: string;
    workspaceId: string;
    type: NotificationInput["type"];
    dedupeKey: string;
    data: NotificationInput["data"];
    sendEmail: (recipientEmail: string) => Promise<void>;
};

async function deliver({ userId, workspaceId, type, dedupeKey, data, sendEmail }: DeliverInput) {
    const notification = await createNotification({ userId, type, dedupeKey, data });


    if (notification) {
        await publishRealtimeEvent({
            type: "notification-created",
            workspaceId,
            data: { userId, notificationId: notification.id },
        });
    }

    const recipient = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });
    if (!recipient) return;

    await sendNotificationEmailIfEnabled({
        userId,
        type,
        send: () => sendEmail(recipient.email),
    });
}

async function handleTaskAssigned(job: TaskAssignedJob) {
    await deliver({
        userId: job.userId,
        workspaceId: job.workspaceId,
        type: "TASK_ASSIGNED",
        dedupeKey: `task-assigned:${job.taskId}:${job.userId}`,
        data: {
            taskId: job.taskId,
            projectId: job.projectId,
            workspaceSlug: job.workspaceSlug,
            assignedBy: job.assignedBy,
            taskTitle: job.taskTitle,
        },
        sendEmail: async (email) =>
            sendTaskAssignmentEmail({
                email,
                taskTitle: job.taskTitle,
                assignedBy: await getDisplayName(job.assignedBy),
            }),
    });
}

async function handleTaskCommented(job: TaskCommentedJob) {
    await deliver({
        userId: job.userId,
        workspaceId: job.workspaceId,
        type: "TASK_COMMENTED",
        dedupeKey: `task-commented:${job.commentId}:${job.userId}`,
        data: {
            taskId: job.taskId,
            projectId: job.projectId,
            workspaceSlug: job.workspaceSlug,
            commentId: job.commentId,
            commentedBy: job.commentedBy,
        },
        sendEmail: async (email) =>
            sendTaskCommentedEmail({
                email,
                taskId: job.taskId,
                commentedBy: await getDisplayName(job.commentedBy),
            }),
    });
}

async function handleMention(job: MentionJob) {
    await deliver({
        userId: job.userId,
        workspaceId: job.workspaceId,
        type: "MENTION",
        dedupeKey: `mention:${job.commentId}:${job.userId}`,
        data: {
            taskId: job.taskId,
            projectId: job.projectId,
            workspaceSlug: job.workspaceSlug,
            commentId: job.commentId,
            mentionedBy: job.mentionedBy,
        },
        sendEmail: async (email) =>
            sendMentionEmail({
                email,
                taskId: job.taskId,
                mentionedBy: await getDisplayName(job.mentionedBy),
            }),
    });
}

async function processJob(job: Job) {
    switch (job.name) {
        case "task-assigned":
            return handleTaskAssigned(job.data as TaskAssignedJob);
        case "task-commented":
            return handleTaskCommented(job.data as TaskCommentedJob);
        case "mention":
            return handleMention(job.data as MentionJob);
        default:
            throw new Error(`Unknown notification job: ${job.name}`);
    }
}

const worker = new Worker("notifications", processJob, {
    connection: queueConnection,
    concurrency: 5,
});

worker.on("completed", (job) => {
    console.log(`Notification job ${job.id} (${job.name}) completed`);
});

worker.on("failed", (job, error) => {
    console.error(`Notification job ${job?.id} (${job?.name}) failed:`, error);
});

console.log("Workvanta notification worker started");