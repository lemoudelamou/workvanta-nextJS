"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { requireTaskEditor } from "@/lib/auth/task_permission";
import { ForbiddenError } from "@/lib/auth/permissions";
import { publishTaskChanged } from "@/lib/realtime/task-events";
import { isRecurrence, RECURRENCE_LABELS } from "@/lib/tasks/recurrence";
import { wouldCreateCycle } from "@/lib/tasks/dependencies";
import { endOfDay } from "@/lib/due-date";

type Result = { error?: string };

const projectPath = (slug: string, projectId: string) => `/workspace/${slug}/project/${projectId}`;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function attempt(run: () => Promise<Result>): Promise<Result> {
    try {
        return await run();
    } catch (error) {
        if (error instanceof ForbiddenError) return { error: error.message };
        const digest = (error as { digest?: unknown })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
        if (error instanceof Error && error.message === "Project not found.") return { error: error.message };
        console.error("Planning action failed:", error);
        return { error: "Something went wrong. Please try again." };
    }
}

function refresh(slug: string, projectId: string, ...taskIds: string[]) {
    revalidatePath(projectPath(slug, projectId));
    for (const id of taskIds) revalidatePath(`${projectPath(slug, projectId)}/tasks/${id}`);
}

function findTask(projectId: string, taskId: string) {
    return prisma.task.findFirst({
        where: { id: taskId, projectId },
        select: { id: true, title: true, dueDate: true },
    });
}

/** Moves a task to another day (or off the calendar) from the calendar view. */
export async function rescheduleTaskAction(
    slug: string,
    projectId: string,
    taskId: string,
    day: string | null,
): Promise<Result> {
    return attempt(async () => {
        const access = await requireTaskEditor(slug, projectId);
        if (day !== null && !DAY.test(day)) return { error: "Pick a valid date." };
        // Saved like every other due date: the end of that day.
        const dueDate = day ? endOfDay(day) : null;
        if (day && !dueDate) return { error: "Pick a valid date." };

        const task = await findTask(access.project.id, taskId);
        if (!task) return { error: "Task not found." };

        await prisma.$transaction([
            prisma.task.update({ where: { id: task.id }, data: { dueDate } }),
            prisma.activity.create({
                data: {
                    action: "TASK_DUE_DATE_CHANGED",
                    entityType: "TASK",
                    entityId: task.id,
                    workspaceId: access.project.workspaceId,
                    userId: access.userId,
                    taskId: task.id,
                    metadata: { from: task.dueDate?.toISOString() ?? null, to: dueDate?.toISOString() ?? null },
                },
            }),
        ]);

        await publishTaskChanged(access.project.id, { taskId: task.id, kind: "updated" });
        refresh(slug, projectId, task.id);
        return {};
    });
}

/** Turns repeating on (DAILY, WEEKDAYS, WEEKLY, MONTHLY) or off (null). */
export async function setTaskRecurrenceAction(
    slug: string,
    projectId: string,
    taskId: string,
    recurrence: string | null,
): Promise<Result> {
    return attempt(async () => {
        const access = await requireTaskEditor(slug, projectId);
        if (recurrence !== null && !isRecurrence(recurrence)) return { error: "Pick how often it repeats." };

        const task = await findTask(access.project.id, taskId);
        if (!task) return { error: "Task not found." };

        await prisma.$transaction([
            prisma.task.update({ where: { id: task.id }, data: { recurrence } }),
            prisma.activity.create({
                data: {
                    action: "TASK_RECURRENCE_CHANGED",
                    entityType: "TASK",
                    entityId: task.id,
                    workspaceId: access.project.workspaceId,
                    userId: access.userId,
                    taskId: task.id,
                    metadata: { from: null, to: recurrence ? RECURRENCE_LABELS[recurrence].toLowerCase() : null },
                },
            }),
        ]);

        await publishTaskChanged(access.project.id, { taskId: task.id, kind: "updated" });
        refresh(slug, projectId, task.id);
        return {};
    });
}

/** "taskId is blocked by blockingTaskId". Both must be in this project. */
export async function addDependencyAction(
    slug: string,
    projectId: string,
    taskId: string,
    blockingTaskId: string,
): Promise<Result> {
    return attempt(async () => {
        const access = await requireTaskEditor(slug, projectId);
        if (taskId === blockingTaskId) return { error: "A task can't wait on itself." };

        const [task, blocker] = await Promise.all([
            findTask(access.project.id, taskId),
            findTask(access.project.id, blockingTaskId),
        ]);
        if (!task || !blocker) return { error: "That task isn't in this project." };

        const edges = await prisma.taskDependency.findMany({
            where: { blockedTask: { projectId: access.project.id } },
            select: { blockedTaskId: true, blockingTaskId: true },
        });
        if (edges.some((e) => e.blockedTaskId === task.id && e.blockingTaskId === blocker.id)) return {};
        if (wouldCreateCycle(edges, task.id, blocker.id)) {
            return { error: `“${blocker.title}” already waits on this task, so it can't block it.` };
        }

        await prisma.$transaction([
            prisma.taskDependency.create({ data: { blockedTaskId: task.id, blockingTaskId: blocker.id } }),
            prisma.activity.create({
                data: {
                    action: "DEPENDENCY_ADDED",
                    entityType: "TASK",
                    entityId: task.id,
                    workspaceId: access.project.workspaceId,
                    userId: access.userId,
                    taskId: task.id,
                    metadata: { from: null, to: blocker.title },
                },
            }),
        ]);

        await publishTaskChanged(access.project.id, { taskId: task.id, kind: "updated" });
        refresh(slug, projectId, task.id, blocker.id);
        return {};
    });
}

export async function removeDependencyAction(
    slug: string,
    projectId: string,
    taskId: string,
    blockingTaskId: string,
): Promise<Result> {
    return attempt(async () => {
        const access = await requireTaskEditor(slug, projectId);
        const [task, blocker] = await Promise.all([
            findTask(access.project.id, taskId),
            findTask(access.project.id, blockingTaskId),
        ]);
        if (!task || !blocker) return { error: "That task isn't in this project." };

        const removed = await prisma.taskDependency.deleteMany({
            where: { blockedTaskId: task.id, blockingTaskId: blocker.id },
        });
        if (removed.count > 0) {
            await prisma.activity.create({
                data: {
                    action: "DEPENDENCY_REMOVED",
                    entityType: "TASK",
                    entityId: task.id,
                    workspaceId: access.project.workspaceId,
                    userId: access.userId,
                    taskId: task.id,
                    metadata: { from: blocker.title, to: null },
                },
            });
        }

        await publishTaskChanged(access.project.id, { taskId: task.id, kind: "updated" });
        refresh(slug, projectId, task.id, blocker.id);
        return {};
    });
}
