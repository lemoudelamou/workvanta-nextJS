import { prisma } from "@/lib/db/prisma-client";
import { projectAudienceWhere } from "@/lib/auth/permissions";

/** Reminders go out when a task is due within this window. */
export const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Overdue reminders only for tasks that became overdue recently, so turning
 *  this on doesn't flood people with years-old tasks. */
export const OVERDUE_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
/** The digest lists tasks due up to this many days ahead (today included). */
export const DIGEST_DAYS_AHEAD = 3;

export type DueTask = {
    id: string;
    title: string;
    dueDate: Date;
    assigneeId: string;
    project: { id: string; name: string; workspaceId: string; visibility: "WORKSPACE" | "PRIVATE"; workspace: { slug: string } };
};

const DUE_TASK_SELECT = {
    id: true,
    title: true,
    dueDate: true,
    assigneeId: true,
    project: {
        select: { id: true, name: true, workspaceId: true, visibility: true, workspace: { select: { slug: true } } },
    },
} as const;

/** Open, assigned tasks with a due date in [from, to). */
async function openAssignedTasksDue(from: Date | null, to: Date) {
    const tasks = await prisma.task.findMany({
        where: {
            status: { not: "DONE" },
            assigneeId: { not: null },
            dueDate: { ...(from ? { gte: from } : {}), lt: to },
        },
        orderBy: { dueDate: "asc" },
        select: DUE_TASK_SELECT,
    });
    return tasks.filter((t): t is DueTask => !!t.dueDate && !!t.assigneeId);
}

/**
 * People only hear about tasks in projects they can still open. Same rule as
 * userCanAccessProject in lib/auth/members, which the worker can't import
 * (it pulls in the web app's session code).
 */
async function userCanAccessProject(userId: string, project: DueTask["project"]) {
    const match = await prisma.workspaceMember.findFirst({
        where: { ...projectAudienceWhere(project), userId },
        select: { id: true },
    });
    return !!match;
}

function accessChecker() {
    const cache = new Map<string, Promise<boolean>>();
    return (userId: string, project: DueTask["project"]) => {
        const key = `${userId}:${project.id}`;
        if (!cache.has(key)) cache.set(key, userCanAccessProject(userId, project));
        return cache.get(key)!;
    };
}

export type DueReminder = {
    kind: "TASK_DUE_SOON" | "TASK_OVERDUE";
    task: DueTask;
    /** One reminder per task, kind and due date: moving the date re-arms it. */
    dedupeKey: string;
};

/** The reminders that should exist right now. Creating them is idempotent. */
export async function findDueReminders(now: Date): Promise<DueReminder[]> {
    const [soon, overdue] = await Promise.all([
        openAssignedTasksDue(now, new Date(now.getTime() + DUE_SOON_WINDOW_MS)),
        openAssignedTasksDue(new Date(now.getTime() - OVERDUE_LOOKBACK_MS), now),
    ]);
    const canOpen = accessChecker();
    const reminders: DueReminder[] = [];

    for (const [kind, tasks] of [
        ["TASK_DUE_SOON", soon],
        ["TASK_OVERDUE", overdue],
    ] as const) {
        for (const task of tasks) {
            if (!(await canOpen(task.assigneeId, task.project))) continue;
            const prefix = kind === "TASK_DUE_SOON" ? "due-soon" : "overdue";
            reminders.push({ kind, task, dedupeKey: `${prefix}:${task.id}:${task.dueDate.toISOString()}` });
        }
    }
    return reminders;
}

// ---------- the morning digest ----------

/** "2026-10-17" for the calendar day `date` falls on in `timeZone`. */
export function dayInZone(date: Date, timeZone: string) {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(day: string, days: number) {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export type DigestItem = { taskId: string; title: string; projectName: string; url: string; dueLabel: string };
export type Digest = { overdue: DigestItem[]; today: DigestItem[]; upcoming: DigestItem[] };

/**
 * Sorts one person's tasks into overdue / due today / coming up, by the
 * calendar in `timeZone`. Tasks further out than DIGEST_DAYS_AHEAD are left
 * out. Returns null when there's nothing to say.
 */
export function groupDigest(tasks: DueTask[], now: Date, timeZone: string, appUrl: string): Digest | null {
    const today = dayInZone(now, timeZone);
    const lastDay = addDays(today, DIGEST_DAYS_AHEAD - 1);
    const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" });
    const digest: Digest = { overdue: [], today: [], upcoming: [] };

    for (const task of tasks) {
        const day = dayInZone(task.dueDate, timeZone);
        const item: DigestItem = {
            taskId: task.id,
            title: task.title,
            projectName: task.project.name,
            url: `${appUrl}/workspace/${task.project.workspace.slug}/project/${task.project.id}/tasks/${task.id}`,
            dueLabel: label.format(task.dueDate),
        };
        if (task.dueDate < now && day < today) digest.overdue.push(item);
        else if (day === today) digest.today.push(item);
        else if (day > today && day <= lastDay) digest.upcoming.push(item);
    }

    return digest.overdue.length + digest.today.length + digest.upcoming.length > 0 ? digest : null;
}

/** Everyone's open tasks that belong in a digest, grouped by assignee. */
export async function findDigestTasks(now: Date) {
    const until = new Date(now.getTime() + (DIGEST_DAYS_AHEAD + 1) * 24 * 60 * 60 * 1000);
    const tasks = await openAssignedTasksDue(null, until);
    const canOpen = accessChecker();
    const byUser = new Map<string, DueTask[]>();
    for (const task of tasks) {
        if (!(await canOpen(task.assigneeId, task.project))) continue;
        const list = byUser.get(task.assigneeId) ?? [];
        list.push(task);
        byUser.set(task.assigneeId, list);
    }
    return byUser;
}
