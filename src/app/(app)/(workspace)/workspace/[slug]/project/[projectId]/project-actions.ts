"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
    requireProjectAccess,
    requireProjectPermission,
    userCanAccessProject,
} from "@/lib/auth/members";
import { ForbiddenError, isProjectVisibility } from "@/lib/auth/permissions";
import { Prisma } from "@/generated/prisma/client";
import { canEditTasks, requireTaskEditor } from "@/lib/auth/task_permission";
import { prisma } from "@/lib/db/prisma";
import { runSerializable, type Tx } from "@/lib/db/serializable";
import { endOfDay } from "@/lib/due-date";
import { createTaskSchema } from "@/lib/validations/tasks";
import { isTaskStatus, type TaskStatus } from "@/lib/task-status";
import { queueTaskAssignedNotification } from "@/lib/queue/notification.queue";

function projectPath(slug: string, projectId: string) {
    return `/workspace/${slug}/project/${projectId}`;
}

function membersPath(slug: string, projectId: string) {
    return `/workspace/${slug}/project/${projectId}/members`;
}

function isRedirectError(error: unknown) {
    const digest = (error as { digest?: unknown })?.digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

async function requireBoardEditor(slug: string, projectId: string) {
    const access = await requireProjectAccess(slug, projectId);

    if (!canEditTasks(access)) {
        throw new Error("You don't have permission to edit tasks in this project.");
    }

    return access;
}

async function nextPosition(tx: Tx, projectId: string, status: TaskStatus) {
    const lastTask = await tx.task.findFirst({
        where: { projectId, status },
        orderBy: { position: "desc" },
        select: { position: true },
    });

    return lastTask ? lastTask.position + 1 : 0;
}

function revalidateProject(slug: string, projectId: string) {
    revalidatePath(projectPath(slug, projectId));
}


export async function deleteProjectAction(projectId: string) {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }

    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            workspace: { members: { some: { userId: session.user.id } } },
        },
        select: {
            id: true,
            workspace: { select: { slug: true } },
        },
    });

    if (!project) {
        return {
            error: "Project not found or you do not have permission to delete it.",
        };
    }

    const { slug } = project.workspace;

    try {
        await requireProjectPermission(slug, project.id, "project.delete");
    } catch (error) {
        if (isRedirectError(error)) throw error;

        return {
            error: "Project not found or you do not have permission to delete it.",
        };
    }

    await prisma.project.delete({ where: { id: project.id } });

    const workspacePath = `/workspace/${slug}`;

    revalidatePath(workspacePath);
    revalidatePath("/dashboard");
    redirect(workspacePath);
}


export async function createTaskAction(
    slug: string,
    projectId: string,
    formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
    let access: Awaited<ReturnType<typeof requireTaskEditor>>;

    try {
        access = await requireTaskEditor(slug, projectId);
    } catch (error) {
        if (isRedirectError(error)) throw error;

        return {
            error:
                error instanceof Error
                    ? error.message
                    : "You can't create tasks in this project.",
        };
    }

    const parsed = createTaskSchema.safeParse({
        title: formData.get("title") ?? "",
        description: formData.get("description") ?? "",
        priority: formData.get("priority") ?? "MEDIUM",
        status: formData.get("status") ?? "TODO",
        assigneeId: formData.get("assigneeId") ?? "",
        dueDate: formData.get("dueDate") ?? "",
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const { title, description, priority, status } = parsed.data;
    const assigneeId = parsed.data.assigneeId || null;
    const userId = access.userId;
    const workspaceId = access.project.workspaceId;

    if (assigneeId && !(await userCanAccessProject(assigneeId, access.project))) {
        return { error: "The selected assignee doesn't have access to this project." };
    }

    let dueDate: Date | null = null;

    if (parsed.data.dueDate) {
        dueDate = endOfDay(parsed.data.dueDate);

        if (!dueDate) {
            return { error: "Invalid due date." };
        }
    }

    let createdTaskId: string | null = null;

    try {
        await runSerializable(async (tx) => {
            const task = await tx.task.create({
                data: {
                    title,
                    description: description || null,
                    priority,
                    status,
                    position: await nextPosition(tx, access.project.id, status),
                    projectId: access.project.id,
                    creatorId: userId,
                    assigneeId,
                    dueDate,
                },
            });

            createdTaskId = task.id;

            await tx.activity.create({
                data: {
                    action: "TASK_CREATED",
                    entityType: "TASK",
                    entityId: task.id,
                    workspaceId,
                    userId,
                    taskId: task.id,
                },
            });

            if (assigneeId) {
                await tx.activity.create({
                    data: {
                        action: "TASK_ASSIGNED",
                        entityType: "TASK",
                        entityId: task.id,
                        workspaceId,
                        userId,
                        taskId: task.id,
                        metadata: { from: null, to: assigneeId },
                    },
                });
            }
        });
    } catch (error) {
        console.error("Failed to create task:", error);
        return { error: "Couldn't create the task. Please try again." };
    }

    // Tell the assignee, unless they assigned it to themselves. The task is
    // already saved, so a queue outage must not turn this into an error.
    if (createdTaskId && assigneeId && assigneeId !== userId) {
        try {
            await queueTaskAssignedNotification({
                userId: assigneeId,
                taskId: createdTaskId,
                taskTitle: title,
                projectId: access.project.id,
                workspaceId,
                workspaceSlug: slug,
                assignedBy: userId,
            });
        } catch (error) {
            console.error("Failed to queue assignment notification:", error);
        }
    }

    revalidateProject(slug, projectId);

    return { success: true };
}

export async function createTaskFromPageAction(
    slug: string,
    projectId: string,
    formData: FormData,
) {
    const result = await createTaskAction(slug, projectId, formData);
    const base = projectPath(slug, projectId);

    if (result.error) {
        redirect(`${base}/tasks/new?error=${encodeURIComponent(result.error)}`);
    }

    redirect(base);
}


export async function addCardAction(
    slug: string,
    projectId: string,
    status: TaskStatus,
    formData: FormData,
) {
    const access = await requireBoardEditor(slug, projectId);

    if (!isTaskStatus(status)) {
        throw new Error("Invalid status.");
    }

    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
        throw new Error("Title is required.");
    }

    if (title.length > 200) {
        throw new Error("Title is too long.");
    }

    await runSerializable(async (tx) => {
        const task = await tx.task.create({
            data: {
                title,
                status,
                projectId: access.project.id,
                position: await nextPosition(tx, access.project.id, status),
                creatorId: access.userId,
            },
        });

        await tx.activity.create({
            data: {
                action: "TASK_CREATED",
                entityType: "TASK",
                entityId: task.id,
                workspaceId: access.project.workspaceId,
                userId: access.userId,
                taskId: task.id,
            },
        });
    });

    revalidateProject(slug, projectId);
}

export async function moveCardAction(
    slug: string,
    projectId: string,
    taskId: string,
    status: TaskStatus,
) {
    const access = await requireBoardEditor(slug, projectId);

    if (!isTaskStatus(status)) {
        throw new Error("Invalid status.");
    }

    await runSerializable(async (tx) => {
        const task = await tx.task.findFirst({
            where: { id: taskId, projectId: access.project.id },
            select: { id: true, status: true },
        });

        if (!task) {
            throw new Error("Task not found.");
        }

        await tx.task.update({
            where: { id: task.id },
            data: {
                status,
                position: await nextPosition(tx, access.project.id, status),
            },
        });

        if (task.status !== status) {
            await tx.activity.create({
                data: {
                    action: "TASK_STATUS_CHANGED",
                    entityType: "TASK",
                    entityId: task.id,
                    workspaceId: access.project.workspaceId,
                    userId: access.userId,
                    taskId: task.id,
                    metadata: { from: task.status, to: status },
                },
            });
        }
    });

    revalidateProject(slug, projectId);
}

export async function deleteCardAction(
    slug: string,
    projectId: string,
    taskId: string,
) {
    const access = await requireBoardEditor(slug, projectId);

    await prisma.$transaction(async (tx) => {
        const deleted = await tx.task.deleteMany({
            where: { id: taskId, projectId: access.project.id },
        });

        if (deleted.count === 0) {
            throw new Error("Task not found.");
        }

        await tx.activity.create({
            data: {
                action: "TASK_DELETED",
                entityType: "TASK",
                entityId: taskId,
                workspaceId: access.project.workspaceId,
                userId: access.userId,
            },
        });
    });

    revalidateProject(slug, projectId);
}

export async function setProjectVisibilityAction(
    slug: string,
    projectId: string,
    visibility: "WORKSPACE" | "PRIVATE",
) {
    if (!isProjectVisibility(visibility)) {
        throw new Error("Invalid visibility.");
    }

    const access = await requireProjectPermission(slug, projectId, "project.update");

    await prisma.project.update({
        where: { id: access.project.id },
        data: { visibility },
    });

    revalidateProject(slug, projectId);
    revalidatePath(membersPath(slug, projectId));
}

export type UpdateProjectDetailsState = { success?: boolean; error?: string };

/** Renames a project or changes its description (project admins). */
export async function updateProjectDetailsAction(
    slug: string,
    projectId: string,
    _previousState: UpdateProjectDetailsState,
    formData: FormData,
): Promise<UpdateProjectDetailsState> {
    let access: Awaited<ReturnType<typeof requireProjectPermission>>;

    try {
        access = await requireProjectPermission(
            slug,
            projectId,
            "project.update",
            "Only project admins can edit project details.",
        );
    } catch (error) {
        if (isRedirectError(error)) throw error;
        if (error instanceof ForbiddenError) return { error: error.message };
        throw error;
    }

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) return { error: "Project name is required." };
    if (name.length > 100) return { error: "Project name must be 100 characters or fewer." };
    if (description.length > 500) {
        return { error: "Description must be 500 characters or fewer." };
    }

    try {
        await prisma.project.update({
            where: { id: access.project.id },
            data: {
                name,
                normalizedName: name.toLowerCase(),
                description: description || null,
            },
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return { error: "Another project in this workspace already has this name." };
        }

        throw error;
    }

    revalidateProject(slug, projectId);
    revalidatePath(`/workspace/${slug}`);
    revalidatePath("/dashboard");

    return { success: true };
}
