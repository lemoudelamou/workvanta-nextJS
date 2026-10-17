"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { requireProjectPermission } from "@/lib/auth/members";
import { requireTaskEditor } from "@/lib/auth/task_permission";
import { ForbiddenError } from "@/lib/auth/permissions";
import { publishTaskChanged } from "@/lib/realtime/task-events";
import {
    isLabelColor,
    LABEL_NAME_MAX,
    nextLabelColor,
    normalizeLabelName,
    presetLabel,
    type TaskLabelView,
} from "@/lib/labels/label-colors";

type Result<T = object> = ({ error?: undefined } & T) | { error: string };

const projectPath = (slug: string, projectId: string) => `/workspace/${slug}/project/${projectId}`;

/** Turns permission and validation failures into a message for the UI. */
async function attempt<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
        return await run();
    } catch (error) {
        if (error instanceof ForbiddenError) return { error: error.message };
        const digest = (error as { digest?: unknown })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
        if (error instanceof Error && error.message === "Project not found.") return { error: error.message };
        console.error("Label action failed:", error);
        return { error: "Something went wrong. Please try again." };
    }
}

function cleanName(value: unknown): Result<{ name: string }> {
    const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    if (!name) return { error: "Give the label a name." };
    if (name.length > LABEL_NAME_MAX) return { error: `Keep label names to ${LABEL_NAME_MAX} characters.` };
    return { name };
}

function refresh(slug: string, projectId: string, taskId?: string) {
    revalidatePath(projectPath(slug, projectId));
    if (taskId) revalidatePath(`${projectPath(slug, projectId)}/tasks/${taskId}`);
}

/** Anyone who can edit tasks can add a label to the project, custom or ready-made. */
export async function createLabelAction(
    slug: string,
    projectId: string,
    rawName: string,
): Promise<Result<{ label: TaskLabelView }>> {
    return attempt(async () => {
        const access = await requireTaskEditor(slug, projectId);
        const cleaned = cleanName(rawName);
        if (cleaned.error !== undefined) return cleaned;

        const normalizedName = normalizeLabelName(cleaned.name);
        const existing = await prisma.label.findUnique({
            where: { projectId_normalizedName: { projectId: access.project.id, normalizedName } },
            select: { id: true, name: true, color: true },
        });
        if (existing) return { label: existing };

        const used = await prisma.label.findMany({ where: { projectId: access.project.id }, select: { color: true } });
        const label = await prisma.label.create({
            data: {
                projectId: access.project.id,
                name: cleaned.name,
                normalizedName,
                // A ready-made label keeps its usual colour.
                color: presetLabel(cleaned.name)?.color ?? nextLabelColor(used.map((l) => l.color)),
            },
            select: { id: true, name: true, color: true },
        });
        refresh(slug, projectId);
        return { label };
    });
}

/** Sets exactly which labels a task has. */
export async function setTaskLabelsAction(
    slug: string,
    projectId: string,
    taskId: string,
    labelIds: string[],
): Promise<Result> {
    return attempt(async () => {
        const access = await requireTaskEditor(slug, projectId);

        const task = await prisma.task.findFirst({
            where: { id: taskId, projectId: access.project.id },
            select: { id: true },
        });
        if (!task) return { error: "Task not found." };

        // Only this project's labels can be attached.
        const ids = [...new Set(labelIds)];
        const valid = await prisma.label.findMany({
            where: { id: { in: ids }, projectId: access.project.id },
            select: { id: true },
        });
        if (valid.length !== ids.length) return { error: "That label no longer exists." };

        await prisma.$transaction([
            prisma.taskLabel.deleteMany({ where: { taskId, labelId: { notIn: ids } } }),
            prisma.taskLabel.createMany({
                data: ids.map((labelId) => ({ taskId, labelId })),
                skipDuplicates: true,
            }),
        ]);

        await publishTaskChanged(access.project.id, { taskId, kind: "updated" });
        refresh(slug, projectId, taskId);
        return {};
    });
}

/** Rename or recolour: project admins only. */
export async function updateLabelAction(
    slug: string,
    projectId: string,
    labelId: string,
    input: { name: string; color: string },
): Promise<Result> {
    return attempt(async () => {
        const access = await requireProjectPermission(
            slug,
            projectId,
            "project.update",
            "Only project admins can edit labels.",
        );
        const cleaned = cleanName(input.name);
        if (cleaned.error !== undefined) return cleaned;
        if (!isLabelColor(input.color)) return { error: "Pick one of the colours." };

        const label = await prisma.label.findFirst({ where: { id: labelId, projectId: access.project.id }, select: { id: true } });
        if (!label) return { error: "That label no longer exists." };

        const normalizedName = normalizeLabelName(cleaned.name);
        const clash = await prisma.label.findFirst({
            where: { projectId: access.project.id, normalizedName, id: { not: labelId } },
            select: { id: true },
        });
        if (clash) return { error: `There's already a label called “${cleaned.name}”.` };

        await prisma.label.update({
            where: { id: labelId },
            data: { name: cleaned.name, normalizedName, color: input.color },
        });
        await publishTaskChanged(access.project.id, { kind: "updated" });
        refresh(slug, projectId);
        return {};
    });
}

/** Removes the label from the project and every task: project admins only. */
export async function deleteLabelAction(slug: string, projectId: string, labelId: string): Promise<Result> {
    return attempt(async () => {
        const access = await requireProjectPermission(
            slug,
            projectId,
            "project.update",
            "Only project admins can delete labels.",
        );
        const deleted = await prisma.label.deleteMany({ where: { id: labelId, projectId: access.project.id } });
        if (deleted.count === 0) return { error: "That label no longer exists." };
        await publishTaskChanged(access.project.id, { kind: "updated" });
        refresh(slug, projectId);
        return {};
    });
}
