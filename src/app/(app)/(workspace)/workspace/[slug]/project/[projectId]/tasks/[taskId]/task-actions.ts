"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { cloudinary } from "@/lib/storage/cloudinary";
import {
    ATTACHMENT_DELIVERY_TYPE,
    parseCloudinaryUrl,
    type CloudinaryResourceType,
} from "@/lib/storage/attachments";
import { requireTaskEditor } from "@/lib/auth/task_permission";
import {
    listProjectAudience,
    requireProjectAccess,
    requireProjectPermission,
    userCanAccessProject,
} from "@/lib/auth/members";
import { canProject, ForbiddenError } from "@/lib/auth/permissions";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";
import { parseMentions } from "@/helpers/parseMentions";
import { isTaskStatus } from "@/lib/task-status";

import { createTaskSchema, updateTaskSchema } from "@/lib/validations/tasks";
import { createCommentSchema } from "@/lib/validations/comments";
import { createSubtaskSchema } from "@/lib/validations/subtask";

import {
    queueTaskAssignedNotification,
    queueTaskCommentedNotification,
    queueMentionNotification,
} from "@/lib/queue/notification.queue";
import { publishTaskChanged } from "@/lib/realtime/task-events";
import { createNextOccurrence } from "@/lib/tasks/recurrence";
import { endOfDay } from "@/lib/due-date";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
];

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type ActivityAction = Prisma.ActivityUncheckedCreateInput["action"];


const projectPath = (slug: string, projectId: string) =>
    `/workspace/${slug}/project/${projectId}`;

const taskPath = (slug: string, projectId: string, taskId: string) =>
    `${projectPath(slug, projectId)}/tasks/${taskId}`;

async function requireUser() {
    const session = await getSession();
    if (!session?.user?.id) redirect("/signin");
    return session.user.id;
}

function memberTaskWhere(
    slug: string,
    projectId: string,
    taskId: string,
    userId: string,
) {
    return {
        id: taskId,
        projectId,
        project: {
            workspace: {
                is: { slug, members: { some: { userId } } },
            },
        },
    };
}

async function requireTaskAccess(
    slug: string,
    projectId: string,
    taskId: string,
) {
    const userId = await requireUser();

    const task = await prisma.task.findFirst({
        where: memberTaskWhere(slug, projectId, taskId, userId),
        select: { id: true, projectId: true },
    });

    if (!task) throw new Error("Task not found.");
    return task;
}

async function requireTaskEditorAccess(
    slug: string,
    projectId: string,
    taskId: string,
) {
    await requireTaskEditor(slug, projectId);
    return requireTaskAccess(slug, projectId, taskId);
}

async function nextPosition(
    tx: Prisma.TransactionClient,
    where: Prisma.TaskWhereInput,
) {
    const last = await tx.task.findFirst({
        where,
        orderBy: { position: "desc" },
        select: { position: true },
    });
    return last ? last.position + 1 : 0;
}

export async function createSimpleTaskAction(
    slug: string,
    projectId: string,
    formData: FormData,
) {
    const userId = await requireUser();
    await requireTaskEditor(slug, projectId);

    const parsed = createTaskSchema.safeParse({
        title: formData.get("title"),
        description: formData.get("description"),
        priority: formData.get("priority"),
    });

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            workspace: { slug, members: { some: { userId } } },
        },
        select: { id: true, workspaceId: true },
    });

    if (!project) throw new Error("Project not found.");

    const createdId = await prisma.$transaction(async (tx) => {
        const task = await tx.task.create({
            data: {
                title: parsed.data.title,
                description: parsed.data.description || null,
                priority: parsed.data.priority,
                position: await nextPosition(tx, { projectId: project.id }),
                projectId: project.id,
                creatorId: userId,
            },
        });

        await tx.activity.create({
            data: {
                action: "TASK_CREATED",
                entityType: "TASK",
                entityId: task.id,
                workspaceId: project.workspaceId,
                userId,
                taskId: task.id,
            },
        });

        return task.id;
    });

    await publishTaskChanged(project.id, { taskId: createdId, kind: "created" });
    redirect(projectPath(slug, project.id));
}

export async function reorderTasksAction({
                                             slug,
                                             projectId,
                                             taskId,
                                             sourceStatus,
                                             destinationStatus,
                                             sourceTaskIds,
                                             destinationTaskIds,
                                         }: {
    slug: string;
    projectId: string;
    taskId: string;
    sourceStatus: TaskStatus;
    destinationStatus: TaskStatus;
    sourceTaskIds: string[];
    destinationTaskIds: string[];
}) {
    const userId = await requireUser();
    await requireTaskEditor(slug, projectId);

    if (!isTaskStatus(sourceStatus) || !isTaskStatus(destinationStatus)) {
        throw new Error("Invalid status.");
    }

    if (
        !destinationTaskIds.includes(taskId) ||
        (sourceStatus !== destinationStatus && sourceTaskIds.includes(taskId))
    ) {
        throw new Error("Invalid task ordering.");
    }

    const task = await prisma.task.findFirst({
        where: memberTaskWhere(slug, projectId, taskId, userId),
        select: {
            id: true,
            projectId: true,
            project: { select: { workspaceId: true } },
        },
    });

    if (!task) throw new Error("Task not found.");


    const allIds = [...new Set([...sourceTaskIds, ...destinationTaskIds])];

    const current = await prisma.task.findMany({
        where: { id: { in: allIds }, projectId: task.projectId },
        select: { id: true, status: true, position: true },
    });

    if (current.length !== allIds.length) throw new Error("Invalid task ordering.");

    const currentById = new Map(current.map((t) => [t.id, t]));


    const desired = new Map<string, { status: TaskStatus; position: number }>();

    sourceTaskIds.forEach((id, position) =>
        desired.set(id, { status: sourceStatus, position }),
    );
    destinationTaskIds.forEach((id, position) =>
        desired.set(id, { status: destinationStatus, position }),
    );

    const changes = [...desired].filter(([id, next]) => {
        const prev = currentById.get(id)!;
        return prev.status !== next.status || prev.position !== next.position;
    });

    if (changes.length === 0) return;

    const repeatId = await prisma.$transaction(async (tx) => {
        for (const [id, { status, position }] of changes) {
            await tx.task.update({ where: { id }, data: { status, position } });
        }

        if (sourceStatus !== destinationStatus) {
            await tx.activity.create({
                data: {
                    action: "TASK_STATUS_CHANGED",
                    entityType: "TASK",
                    entityId: task.id,
                    workspaceId: task.project.workspaceId,
                    userId,
                    taskId: task.id,
                    metadata: { from: sourceStatus, to: destinationStatus },
                },
            });
        }

        // Finishing a repeating task brings the next one in.
        return destinationStatus === "DONE" && sourceStatus !== "DONE"
            ? createNextOccurrence(tx, task.id, userId)
            : null;
    });

    await publishTaskChanged(projectId, { taskId, kind: "moved" });
    if (repeatId) await publishTaskChanged(projectId, { taskId: repeatId, kind: "created" });
    revalidatePath(projectPath(slug, projectId));
}

export async function updateTaskAction(
    slug: string,
    projectId: string,
    taskId: string,
    formData: FormData,
) {
    const userId = await requireUser();
    const access = await requireTaskEditor(slug, projectId);

    const result = updateTaskSchema.safeParse({
        title: formData.get("title"),
        description: formData.get("description"),
        status: formData.get("status"),
        priority: formData.get("priority"),
        assigneeId: formData.get("assigneeId"),
        dueDate: formData.get("dueDate"),
    });

    if (!result.success) {
        throw new Error(result.error.issues[0]?.message ?? "Invalid task data");
    }

    const data = result.data;

    const task = await prisma.task.findFirst({
        where: memberTaskWhere(slug, projectId, taskId, userId),
        select: {
            id: true,
            projectId: true,
            status: true,
            priority: true,
            position: true,
            assigneeId: true,
            project: { select: { workspaceId: true } },
        },
    });

    if (!task) throw new Error("Task not found.");

    const workspaceId = task.project.workspaceId;
    const assigneeId = data.assigneeId || null;

    if (
        assigneeId &&
        assigneeId !== task.assigneeId &&
        !(await userCanAccessProject(assigneeId, access.project))
    ) {
        throw new Error("The selected assignee doesn't have access to this project.");
    }

    let dueDate: Date | null = null;
    if (data.dueDate) {
        // The end of that day in UTC, the calendar due dates are shown in.
        dueDate = endOfDay(data.dueDate);
        if (!dueDate) throw new Error("Invalid due date.");
    }

    const statusChanged = task.status !== data.status;
    const priorityChanged = task.priority !== data.priority;
    const assigneeChanged = task.assigneeId !== assigneeId;

    const repeatId = await prisma.$transaction(async (tx) => {
        const position = statusChanged
            ? await nextPosition(tx, {
                projectId,
                status: data.status,
                id: { not: taskId },
            })
            : task.position;

        await tx.task.update({
            where: { id: taskId },
            data: {
                title: data.title,
                description: data.description || null,
                status: data.status,
                priority: data.priority,
                assigneeId,
                dueDate,
                position,
            },
        });

        const log = (
            action: ActivityAction,
            from: string | null,
            to: string | null,
        ) =>
            tx.activity.create({
                data: {
                    action,
                    entityType: "TASK",
                    entityId: task.id,
                    workspaceId,
                    userId,
                    taskId: task.id,
                    metadata: { from, to },
                },
            });

        if (statusChanged) await log("TASK_STATUS_CHANGED", task.status, data.status);
        if (priorityChanged) await log("TASK_PRIORITY_CHANGED", task.priority, data.priority);
        if (assigneeChanged) await log("TASK_ASSIGNED", task.assigneeId, assigneeId);

        // Finishing a repeating task brings the next one in.
        return statusChanged && data.status === "DONE" ? createNextOccurrence(tx, task.id, userId) : null;
    });

    if (assigneeChanged && assigneeId && assigneeId !== userId) {
        await queueTaskAssignedNotification({
            userId: assigneeId,
            taskId: task.id,
            taskTitle: data.title, // the new title, not the pre-edit one
            projectId: task.projectId,
            workspaceId,
            workspaceSlug: slug,
            assignedBy: userId,
        });
    }

    await publishTaskChanged(projectId, { taskId, kind: "updated" });
    if (repeatId) await publishTaskChanged(projectId, { taskId: repeatId, kind: "created" });
    revalidatePath(projectPath(slug, projectId));
    revalidatePath(taskPath(slug, projectId, taskId));
    redirect(taskPath(slug, projectId, taskId));
}

export async function deleteTaskAction(
    slug: string,
    projectId: string,
    taskId: string,
) {
    const userId = await requireUser();
    await requireTaskEditor(slug, projectId);

    const task = await prisma.task.findFirst({
        where: memberTaskWhere(slug, projectId, taskId, userId),
        select: { id: true, project: { select: { workspaceId: true } } },
    });

    if (!task) throw new Error("Task not found.");

    await prisma.$transaction(async (tx) => {
        await tx.task.delete({ where: { id: taskId } });

        await tx.activity.create({
            data: {
                action: "TASK_DELETED",
                entityType: "TASK",
                entityId: taskId,
                workspaceId: task.project.workspaceId,
                userId,
            },
        });
    });

    await publishTaskChanged(projectId, { taskId, kind: "deleted" });
    redirect(projectPath(slug, projectId));
}

export async function createCommentAction(
    slug: string,
    projectId: string,
    taskId: string,
    formData: FormData,
) {
    const session = await getSession();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const currentUserId = session.user.id;

    // Viewers can join the discussion, but only on projects they can open —
    // workspace membership alone is not enough for private projects.
    let access: Awaited<ReturnType<typeof requireProjectAccess>>;
    try {
        access = await requireProjectPermission(slug, projectId, "task.comment");
    } catch (error) {
        if (error instanceof ForbiddenError) return { error: error.message };
        throw error;
    }

    const result = createCommentSchema.safeParse({
        content: formData.get("content"),
    });
    if (!result.success) return { error: "Invalid comment" };

    const content = result.data.content;
    const mentionedEmails = parseMentions(content);

    const task = await prisma.task.findFirst({
        where: { id: taskId, projectId, project: { workspace: { slug } } },
        select: {
            id: true,
            creatorId: true,
            assigneeId: true,
            project: {
                select: {
                    id: true,
                    workspaceId: true,
                    workspace: { select: { slug: true } },
                },
            },
        },
    });

    if (!task) return { error: "Task not found" };

    const { workspaceId } = task.project;

    // Only people who can open this project may be notified about it.
    const audienceIds = new Set(
        (await listProjectAudience(access.project)).map((user) => user.id),
    );

    const { comment, mentionedIds } = await prisma.$transaction(async (tx) => {
        const comment = await tx.comment.create({
            data: { content, taskId: task.id, authorId: currentUserId },
            include: {
                author: { select: { id: true, name: true, email: true, image: true } },
            },
        });

        const mentionedMembers = mentionedEmails.length
            ? await tx.workspaceMember.findMany({
                where: { workspaceId, user: { email: { in: mentionedEmails } } },
                select: { user: { select: { id: true } } },
            })
            : [];

        const mentionedIds = new Set(
            mentionedMembers
                .map((m) => m.user.id)
                .filter((id) => audienceIds.has(id)),
        );
        mentionedIds.delete(currentUserId);

        return { comment, mentionedIds };
    });

    const commentedIds = new Set<string>();
    if (task.creatorId) commentedIds.add(task.creatorId);
    if (task.assigneeId) commentedIds.add(task.assigneeId);
    commentedIds.delete(currentUserId);
    for (const id of mentionedIds) commentedIds.delete(id);
    for (const id of commentedIds) if (!audienceIds.has(id)) commentedIds.delete(id);

    const base = {
        taskId: task.id,
        projectId: task.project.id,
        workspaceSlug: task.project.workspace.slug,
        workspaceId,
        commentId: comment.id,
    };

    // Live update for everyone who can open this project (and nobody else).
    // Best-effort: the comment is saved even if realtime is unavailable.
    try {
        await publishRealtimeEvent({
            type: "comment-created",
            workspaceId,
            recipientIds: [...audienceIds],
            data: {
                commentId: comment.id,
                taskId: task.id,
                projectId: task.project.id,
                authorId: currentUserId,
            },
        });
    } catch (error) {
        console.error("Failed to publish comment event:", error);
    }

    for (const userId of commentedIds) {
        await queueTaskCommentedNotification({
            ...base,
            userId,
            commentedBy: currentUserId,
        });
    }

    for (const userId of mentionedIds) {
        await queueMentionNotification({
            ...base,
            userId,
            mentionedBy: currentUserId,
        });
    }

    revalidatePath(taskPath(slug, projectId, taskId));

    return { success: true, comment };
}

async function findOwnComment(
    slug: string,
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
    { allowModerator = false }: { allowModerator?: boolean } = {},
) {
    // Must still be able to open the project (access may have been revoked).
    const access = await requireProjectAccess(slug, projectId);
    const canModerate =
        allowModerator && canProject(access.effectiveRole, "comment.moderate");

    const comment = await prisma.comment.findFirst({
        where: {
            id: commentId,
            taskId,
            // Authors manage their own comments; project admins can remove
            // any comment for moderation.
            ...(canModerate ? {} : { authorId: userId }),
            task: {
                id: taskId,
                projectId,
                project: { workspace: { slug, members: { some: { userId } } } },
            },
        },
        select: {
            id: true,
            taskId: true,
            task: { select: { project: { select: { workspaceId: true } } } },
        },
    });

    if (!comment) throw new Error("Comment not found.");
    return comment;
}

export async function deleteCommentAction(
    slug: string,
    projectId: string,
    taskId: string,
    commentId: string,
) {
    const userId = await requireUser();
    const comment = await findOwnComment(slug, projectId, taskId, commentId, userId, {
        allowModerator: true,
    });

    await prisma.$transaction(async (tx) => {
        await tx.comment.delete({ where: { id: comment.id } });

        await tx.activity.create({
            data: {
                action: "COMMENT_DELETED",
                entityType: "COMMENT",
                entityId: comment.id,
                workspaceId: comment.task.project.workspaceId,
                userId,
                taskId: comment.taskId,
            },
        });
    });

    await publishTaskChanged(projectId, { taskId, kind: "comments" });
    revalidatePath(taskPath(slug, projectId, taskId));
}

export async function updateCommentAction(
    slug: string,
    projectId: string,
    taskId: string,
    commentId: string,
    formData: FormData,
) {
    const userId = await requireUser();

    const parsed = createCommentSchema.safeParse({
        content: formData.get("content"),
    });
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment.");
    }

    const comment = await findOwnComment(slug, projectId, taskId, commentId, userId);

    await prisma.$transaction(async (tx) => {
        await tx.comment.update({
            where: { id: comment.id },
            data: { content: parsed.data.content },
        });

        await tx.activity.create({
            data: {
                action: "COMMENT_UPDATED",
                entityType: "COMMENT",
                entityId: comment.id,
                workspaceId: comment.task.project.workspaceId,
                userId,
                taskId: comment.taskId,
            },
        });
    });

    await publishTaskChanged(projectId, { taskId, kind: "comments" });
    revalidatePath(taskPath(slug, projectId, taskId));
}


export async function createSubtaskAction(
    slug: string,
    projectId: string,
    taskId: string,
    formData: FormData,
) {
    const task = await requireTaskEditorAccess(slug, projectId, taskId);

    const parsed = createSubtaskSchema.safeParse({
        title: formData.get("title"),
    });
    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid subtask.");
    }

    const last = await prisma.subtask.findFirst({
        where: { taskId: task.id },
        orderBy: { position: "desc" },
        select: { position: true },
    });

    await prisma.subtask.create({
        data: {
            title: parsed.data.title,
            taskId: task.id,
            position: last ? last.position + 1 : 0,
        },
    });

    await publishTaskChanged(projectId, { taskId, kind: "subtasks" });
    revalidatePath(taskPath(slug, projectId, taskId));
}

export async function toggleSubtaskAction(
    slug: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
) {
    const task = await requireTaskEditorAccess(slug, projectId, taskId);

    const subtask = await prisma.subtask.findFirst({
        where: { id: subtaskId, taskId: task.id },
    });
    if (!subtask) throw new Error("Subtask not found.");

    await prisma.subtask.update({
        where: { id: subtask.id },
        data: { completed: !subtask.completed },
    });

    await publishTaskChanged(projectId, { taskId, kind: "subtasks" });
    revalidatePath(taskPath(slug, projectId, taskId));
}

export async function deleteSubtaskAction(
    slug: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
) {
    const task = await requireTaskEditorAccess(slug, projectId, taskId);

    const subtask = await prisma.subtask.findFirst({
        where: { id: subtaskId, taskId: task.id },
    });
    if (!subtask) throw new Error("Subtask not found.");

    await prisma.subtask.delete({ where: { id: subtask.id } });

    await publishTaskChanged(projectId, { taskId, kind: "subtasks" });
    revalidatePath(taskPath(slug, projectId, taskId));
}


function uploadToCloudinary(buffer: Buffer, folder: string) {
    return new Promise<{
        secure_url: string;
        public_id: string;
        bytes: number;
        resource_type: string;
    }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto",
                // Private delivery: files are only reachable through a
                // signed, expiring link from /api/attachments/[id].
                type: ATTACHMENT_DELIVERY_TYPE,
                use_filename: true,
                unique_filename: true,
            },
            (error, result) => {
                if (error || !result) {
                    return reject(error ?? new Error("Cloudinary upload failed."));
                }

                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                    bytes: result.bytes,
                    resource_type: result.resource_type,
                });
            },
        );

        stream.end(buffer);
    });
}

export async function uploadAttachmentAction(
    slug: string,
    projectId: string,
    taskId: string,
    formData: FormData,
) {
    const userId = await requireUser();
    await requireTaskEditor(slug, projectId);

    const file = formData.get("file");

    if (!(file instanceof File)) throw new Error("No file selected.");
    if (file.size === 0) throw new Error("The selected file is empty.");
    if (file.size > MAX_FILE_SIZE) throw new Error("File size must be less than 10 MB.");
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error("This file type is not supported.");
    }

    const task = await prisma.task.findFirst({
        where: memberTaskWhere(slug, projectId, taskId, userId),
        select: { id: true, project: { select: { workspaceId: true } } },
    });
    if (!task) throw new Error("Task not found.");

    const workspaceId = task.project.workspaceId;

    const upload = await uploadToCloudinary(
        Buffer.from(await file.arrayBuffer()),
        `Workvanta/${workspaceId}/tasks/${task.id}`,
    );

    try {
        await prisma.$transaction(async (tx) => {
            const attachment = await tx.attachment.create({
                data: {
                    filename: file.name,
                    url: upload.secure_url,
                    size: upload.bytes,
                    mimeType: file.type,
                    taskId: task.id,
                    uploadedById: userId,
                },
            });

            await tx.activity.create({
                data: {
                    action: "ATTACHMENT_UPLOADED",
                    entityType: "ATTACHMENT",
                    entityId: attachment.id,
                    workspaceId,
                    userId,
                    taskId: task.id,
                    metadata: { filename: file.name, size: upload.bytes },
                },
            });
        });
    } catch (error) {
        await cloudinary.uploader.destroy(upload.public_id, {
            resource_type: upload.resource_type as CloudinaryResourceType,
            type: ATTACHMENT_DELIVERY_TYPE,
        });
        throw error;
    }

    await publishTaskChanged(projectId, { taskId, kind: "attachments" });
    revalidatePath(taskPath(slug, projectId, taskId));
}

export async function deleteAttachmentAction(
    slug: string,
    projectId: string,
    taskId: string,
    attachmentId: string,
) {
    const userId = await requireUser();
    await requireTaskEditor(slug, projectId);

    const attachment = await prisma.attachment.findFirst({
        where: {
            id: attachmentId,
            taskId,
            task: {
                projectId,
                project: { workspace: { slug, members: { some: { userId } } } },
            },
        },
        select: {
            id: true,
            filename: true,
            url: true,
            taskId: true,
            task: { select: { project: { select: { workspaceId: true } } } },
        },
    });

    if (!attachment) throw new Error("Attachment not found.");

    const { publicId, resourceType, deliveryType } = parseCloudinaryUrl(attachment.url);

    await prisma.$transaction(async (tx) => {
        await tx.attachment.delete({ where: { id: attachment.id } });

        await tx.activity.create({
            data: {
                action: "ATTACHMENT_DELETED",
                entityType: "ATTACHMENT",
                entityId: attachment.id,
                workspaceId: attachment.task.project.workspaceId,
                userId,
                taskId: attachment.taskId,
                metadata: { filename: attachment.filename },
            },
        });
    });

    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            type: deliveryType,
        });
    } catch (error) {
        console.error("Failed to delete Cloudinary file:", publicId, error);
    }

    await publishTaskChanged(projectId, { taskId, kind: "attachments" });
    revalidatePath(taskPath(slug, projectId, taskId));
}