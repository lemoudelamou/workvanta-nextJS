import type { Prisma } from "@/generated/prisma/client";

export const RECURRENCES = ["DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
    DAILY: "Every day",
    WEEKDAYS: "Every weekday",
    WEEKLY: "Every week",
    MONTHLY: "Every month",
};

export function isRecurrence(value: unknown): value is Recurrence {
    return typeof value === "string" && (RECURRENCES as readonly string[]).includes(value);
}

/**
 * One step forward on the UTC calendar, which is the one due dates are saved
 * and shown in. Months keep the day where they can (Jan 31 → Feb 28).
 */
function step(date: Date, rule: Recurrence) {
    const next = new Date(date);
    switch (rule) {
        case "DAILY":
            next.setUTCDate(next.getUTCDate() + 1);
            break;
        case "WEEKDAYS":
            do next.setUTCDate(next.getUTCDate() + 1);
            while (next.getUTCDay() === 0 || next.getUTCDay() === 6);
            break;
        case "WEEKLY":
            next.setUTCDate(next.getUTCDate() + 7);
            break;
        case "MONTHLY": {
            const day = next.getUTCDate();
            next.setUTCDate(1);
            next.setUTCMonth(next.getUTCMonth() + 1);
            const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
            next.setUTCDate(Math.min(day, lastDay));
            break;
        }
    }
    return next;
}

/**
 * When the next copy is due: one step after the current due date, skipping
 * ahead past dates already gone (a weekly task finished three weeks late
 * comes back next week, not three times). Without a due date, it counts
 * from the end of today.
 */
export function nextDueDate(dueDate: Date | null, rule: Recurrence, now: Date) {
    let next = dueDate ?? endOfDay(now);
    do next = step(next, rule);
    while (next <= now);
    return next;
}

function endOfDay(date: Date) {
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 0);
    return end;
}

/**
 * Called in the same transaction that marks a task done. If it repeats and
 * hasn't been repeated yet, makes a fresh copy (to do, same details, labels
 * and an unticked checklist) and returns its id.
 */
export async function createNextOccurrence(
    tx: Prisma.TransactionClient,
    taskId: string,
    userId: string,
    now = new Date(),
) {
    const task = await tx.task.findUnique({
        where: { id: taskId },
        select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            dueDate: true,
            projectId: true,
            assigneeId: true,
            creatorId: true,
            recurrence: true,
            nextOccurrenceId: true,
            project: { select: { workspaceId: true } },
            labels: { select: { labelId: true } },
            subtasks: { orderBy: { position: "asc" }, select: { title: true, position: true } },
        },
    });
    if (!task?.recurrence || task.nextOccurrenceId) return null;

    const last = await tx.task.findFirst({
        where: { projectId: task.projectId, status: "TODO" },
        orderBy: { position: "desc" },
        select: { position: true },
    });
    const dueDate = nextDueDate(task.dueDate, task.recurrence, now);

    const copy = await tx.task.create({
        data: {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: "TODO",
            position: last ? last.position + 1 : 0,
            dueDate,
            recurrence: task.recurrence,
            projectId: task.projectId,
            assigneeId: task.assigneeId,
            creatorId: task.creatorId,
            labels: { create: task.labels.map(({ labelId }) => ({ labelId })) },
            subtasks: { create: task.subtasks.map(({ title, position }) => ({ title, position })) },
        },
        select: { id: true },
    });

    // Claim the slot; if someone else finished it at the same moment, theirs wins.
    const claimed = await tx.task.updateMany({
        where: { id: task.id, nextOccurrenceId: null },
        data: { nextOccurrenceId: copy.id },
    });
    if (claimed.count === 0) {
        await tx.task.delete({ where: { id: copy.id } });
        return null;
    }

    await tx.activity.create({
        data: {
            action: "TASK_REPEATED",
            entityType: "TASK",
            entityId: copy.id,
            workspaceId: task.project.workspaceId,
            userId,
            taskId: copy.id,
            metadata: { from: task.id, to: dueDate.toISOString() },
        },
    });

    return copy.id;
}
