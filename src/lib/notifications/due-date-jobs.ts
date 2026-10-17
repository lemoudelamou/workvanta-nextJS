import { prisma } from "@/lib/db/prisma-client";
import { createNotification } from "@/lib/notifications/create-notification";
import { dayInZone, findDigestTasks, findDueReminders, groupDigest } from "@/lib/notifications/due-dates";
import { sendDueDigestEmail } from "@/lib/email/mailer";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";

/** The bits of a Redis client the digest needs to send at most once a day. */
type OnceStore = {
    set(key: string, value: string, ex: "EX", seconds: number, nx: "NX"): Promise<unknown>;
    del(key: string): Promise<unknown>;
};

export function digestSchedule() {
    const hour = Number(process.env.DIGEST_HOUR ?? "8");
    return {
        pattern: `0 ${Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 8} * * *`,
        tz: process.env.DIGEST_TIMEZONE || "UTC",
    };
}

/** In-app reminders for tasks due within a day, or overdue. Each goes out once. */
export async function runDueDateSweep(now = new Date()) {
    const reminders = await findDueReminders(now);
    let created = 0;

    for (const { kind, task, dedupeKey } of reminders) {
        const existing = await prisma.notification.findUnique({ where: { dedupeKey }, select: { id: true } });
        if (existing) continue;

        const notification = await createNotification({
            userId: task.assigneeId,
            type: kind,
            dedupeKey,
            data: {
                taskId: task.id,
                projectId: task.project.id,
                workspaceSlug: task.project.workspace.slug,
                taskTitle: task.title,
                dueDate: task.dueDate.toISOString(),
            },
        });
        if (!notification) continue;

        created++;
        await publishRealtimeEvent({
            type: "notification-created",
            workspaceId: task.project.workspaceId,
            data: { userId: task.assigneeId, notificationId: notification.id },
        });
    }

    return { checked: reminders.length, created };
}

/** One summary email per person each morning, if they have anything due. */
export async function runDailyDigest(store: OnceStore, now = new Date()) {
    const { tz } = digestSchedule();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const byUser = await findDigestTasks(now);
    if (byUser.size === 0) return { sent: 0 };

    const users = await prisma.user.findMany({
        where: { id: { in: [...byUser.keys()] } },
        select: { id: true, email: true, name: true, notificationPreferences: { select: { emailDueDates: true } } },
    });
    const today = dayInZone(now, tz);
    let sent = 0;

    for (const user of users) {
        if (user.notificationPreferences && !user.notificationPreferences.emailDueDates) continue;
        const digest = groupDigest(byUser.get(user.id) ?? [], now, tz, appUrl);
        if (!digest) continue;

        // A retried job, or a second worker, must not send it twice.
        const key = `digest:${user.id}:${today}`;
        if (!(await store.set(key, "1", "EX", 2 * 24 * 60 * 60, "NX"))) continue;

        try {
            await sendDueDigestEmail({ email: user.email, name: user.name, digest });
            sent++;
        } catch (error) {
            await store.del(key);
            console.error(`Due date digest for ${user.id} failed:`, error);
        }
    }

    return { sent };
}
