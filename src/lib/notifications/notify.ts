import { after } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { createNotification, sendNotificationEmailIfEnabled } from "@/lib/notifications/create-notification";
import { sendMentionEmail, sendTaskAssignmentEmail, sendTaskCommentedEmail } from "@/lib/email/mailer";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";
import { newlyUnblocked } from "@/lib/tasks/dependencies";
import type { NotificationType, Prisma } from "@/generated/prisma/client";

export type TaskAssignedNotice = {
    userId: string;
    taskId: string;
    taskTitle: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    assignedBy: string;
};

export type TaskCommentedNotice = {
    userId: string;
    taskId: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    commentId: string;
    commentedBy: string;
};

/** A task was just marked done; tell whoever was waiting on it. */
export type TaskDoneNotice = {
    taskId: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    completedBy: string;
};

export type MentionNotice = {
    userId: string;
    taskId: string;
    projectId: string;
    workspaceId: string;
    workspaceSlug: string;
    commentId: string;
    mentionedBy: string;
};

/**
 * Runs once the response has been sent, so a slow email server never holds
 * up the action, and a failure is logged rather than undoing the change.
 */
function afterResponse(label: string, work: () => Promise<void>) {
    after(async () => {
        try {
            await work();
        } catch (error) {
            console.error(`${label} failed:`, error);
        }
    });
}

async function displayName(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
    });

    return user?.name?.trim() || user?.email || "Someone";
}

type Delivery = {
    userId: string;
    workspaceId: string;
    type: NotificationType;
    dedupeKey: string;
    data: Prisma.InputJsonValue;
    /** Leave out for in-app only. */
    sendEmail?: (recipientEmail: string) => Promise<void>;
};

/** In-app notification (if wanted), a live badge update, then email (if wanted). */
export async function deliver({ userId, workspaceId, type, dedupeKey, data, sendEmail }: Delivery) {
    const notification = await createNotification({ userId, type, dedupeKey, data });

    if (notification) {
        await publishRealtimeEvent({
            type: "notification-created",
            workspaceId,
            data: { userId, notificationId: notification.id },
        });
    }

    if (!sendEmail) return;

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

export function notifyTaskAssigned(notice: TaskAssignedNotice) {
    afterResponse("Task assignment notification", () =>
        deliver({
            userId: notice.userId,
            workspaceId: notice.workspaceId,
            type: "TASK_ASSIGNED",
            dedupeKey: `task-assigned:${notice.taskId}:${notice.userId}`,
            data: {
                taskId: notice.taskId,
                projectId: notice.projectId,
                workspaceSlug: notice.workspaceSlug,
                assignedBy: notice.assignedBy,
                taskTitle: notice.taskTitle,
            },
            sendEmail: async (email) =>
                sendTaskAssignmentEmail({
                    email,
                    taskTitle: notice.taskTitle,
                    assignedBy: await displayName(notice.assignedBy),
                }),
        }),
    );
}

export function notifyTaskCommented(notice: TaskCommentedNotice) {
    afterResponse("Comment notification", () =>
        deliver({
            userId: notice.userId,
            workspaceId: notice.workspaceId,
            type: "TASK_COMMENTED",
            dedupeKey: `task-commented:${notice.commentId}:${notice.userId}`,
            data: {
                taskId: notice.taskId,
                projectId: notice.projectId,
                workspaceSlug: notice.workspaceSlug,
                commentId: notice.commentId,
                commentedBy: notice.commentedBy,
            },
            sendEmail: async (email) =>
                sendTaskCommentedEmail({
                    email,
                    taskId: notice.taskId,
                    commentedBy: await displayName(notice.commentedBy),
                }),
        }),
    );
}

export function notifyMention(notice: MentionNotice) {
    afterResponse("Mention notification", () =>
        deliver({
            userId: notice.userId,
            workspaceId: notice.workspaceId,
            type: "MENTION",
            dedupeKey: `mention:${notice.commentId}:${notice.userId}`,
            data: {
                taskId: notice.taskId,
                projectId: notice.projectId,
                workspaceSlug: notice.workspaceSlug,
                commentId: notice.commentId,
                mentionedBy: notice.mentionedBy,
            },
            sendEmail: async (email) =>
                sendMentionEmail({
                    email,
                    taskId: notice.taskId,
                    mentionedBy: await displayName(notice.mentionedBy),
                }),
        }),
    );
}

/**
 * The tasks that waited on this one and now have no open blockers: each
 * assignee gets an in-app "unblocked" notice (no email). Whoever finished
 * the task already knows, so they're skipped.
 */
export function notifyTaskDone(notice: TaskDoneNotice) {
    // Finishing it again later (after reopening) counts as new.
    const completedAt = new Date().toISOString();

    afterResponse("Unblocked notifications", async () => {
        const waiting = await prisma.task.findMany({
            where: { blockedBy: { some: { blockingTaskId: notice.taskId } } },
            select: {
                id: true,
                title: true,
                status: true,
                assigneeId: true,
                blockedBy: { select: { blockingTask: { select: { status: true } } } },
            },
        });

        for (const task of newlyUnblocked(waiting)) {
            const userId = task.assigneeId!;
            if (userId === notice.completedBy) continue;

            await deliver({
                userId,
                workspaceId: notice.workspaceId,
                type: "TASK_UNBLOCKED",
                dedupeKey: `task-unblocked:${task.id}:${notice.taskId}:${completedAt}`,
                data: {
                    taskId: task.id,
                    projectId: notice.projectId,
                    workspaceSlug: notice.workspaceSlug,
                    taskTitle: task.title,
                    completedBy: notice.completedBy,
                    blockerId: notice.taskId,
                },
            });
        }
    });
}
