import { prisma } from "@/lib/db/prisma";
import { effectiveProjectRole, type ProjectRoleName, type WorkspaceRoleName } from "@/lib/auth/permissions";
import { timeAgo } from "@/helpers/timeAgo";

/** What a notification row needs to say who did what, where. */
export type NotificationView = {
    id: string;
    type: string;
    read: boolean;
    createdAt: string;
    /** "2 hours ago": worked out on the server so it renders the same everywhere. */
    timeLabel: string;
    /** "Today", "Yesterday" or "Earlier": groups the full list. */
    group: "Today" | "Yesterday" | "Earlier";
    actor: { name: string; email: string; image: string | null } | null;
    /** e.g. "mentioned you in" — the actor's name goes before, the task after. */
    verb: string;
    taskTitle: string | null;
    projectName: string | null;
    projectId: string | null;
    /** A short piece of the comment, mentions shown as plain names. */
    snippet: string | null;
    href: string | null;
};

type RawNotification = {
    id: string;
    type: string;
    data: unknown;
    readAt: Date | null;
    createdAt: Date;
};

type NotificationData = {
    taskId?: string;
    projectId?: string;
    workspaceSlug?: string;
    commentId?: string;
    assignedBy?: string;
    commentedBy?: string;
    mentionedBy?: string;
    taskTitle?: string;
};

const MENTION = /@\[([^\]]+)\]\([^)]+\)/g;
const SNIPPET_LENGTH = 140;

function readData(data: unknown): NotificationData {
    if (!data || typeof data !== "object") return {};
    const out: NotificationData = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (typeof value === "string") (out as Record<string, string>)[key] = value;
    }
    return out;
}

function actorId(data: NotificationData) {
    return data.mentionedBy ?? data.commentedBy ?? data.assignedBy ?? null;
}

export function notificationVerb(type: string) {
    switch (type) {
        case "MENTION":
            return "mentioned you in";
        case "TASK_COMMENTED":
            return "commented on";
        case "TASK_ASSIGNED":
            return "assigned you";
        case "INVITATION":
            return "invited you to a workspace";
        case "PROJECT_UPDATED":
            return "updated a project";
        default:
            return "sent you a notification";
    }
}

/** Comment text for a one-line preview: mentions as names, whitespace squashed. */
export function commentSnippet(content: string) {
    const text = content.replace(MENTION, "$1").replace(/\s+/g, " ").trim();
    return text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH - 1).trimEnd()}…` : text;
}

function dayGroup(date: Date, now: Date): NotificationView["group"] {
    const startOf = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
    return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
}

/**
 * Turns stored notifications into rows people can read. Task names,
 * comments and links only appear while the reader can still open that
 * project, so nothing leaks after someone loses access.
 */
export async function buildNotificationViews(userId: string, notifications: RawNotification[]) {
    if (notifications.length === 0) return [];
    const parsed = notifications.map((n) => ({ ...n, info: readData(n.data) }));

    const ids = (pick: (d: NotificationData) => string | null | undefined) => [
        ...new Set(parsed.map((n) => pick(n.info)).filter((v): v is string => !!v)),
    ];

    const [actors, tasks, comments, projects] = await Promise.all([
        prisma.user.findMany({
            where: { id: { in: ids(actorId) } },
            select: { id: true, name: true, email: true, image: true },
        }),
        prisma.task.findMany({
            where: { id: { in: ids((d) => d.taskId) } },
            select: { id: true, title: true, projectId: true },
        }),
        prisma.comment.findMany({
            where: { id: { in: ids((d) => d.commentId) } },
            select: { id: true, content: true, taskId: true },
        }),
        prisma.project.findMany({
            where: { id: { in: ids((d) => d.projectId) } },
            select: {
                id: true,
                name: true,
                visibility: true,
                workspace: { select: { slug: true, members: { where: { userId }, select: { role: true } } } },
                members: { where: { userId }, select: { role: true } },
            },
        }),
    ]);

    const actorById = new Map(actors.map((a) => [a.id, a]));
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const commentById = new Map(comments.map((c) => [c.id, c]));
    const openable = new Map(
        projects
            .filter((p) =>
                effectiveProjectRole({
                    workspaceRole: (p.workspace.members[0]?.role as WorkspaceRoleName | undefined) ?? null,
                    projectRole: (p.members[0]?.role as ProjectRoleName | undefined) ?? null,
                    visibility: p.visibility,
                }),
            )
            .map((p) => [p.id, p]),
    );

    const now = new Date();

    return parsed.map(({ id, type, readAt, createdAt, info }): NotificationView => {
        const actor = actorById.get(actorId(info) ?? "");
        const project = info.projectId ? openable.get(info.projectId) : undefined;
        const task = project && info.taskId ? taskById.get(info.taskId) : undefined;
        // The task must still belong to that project (it may have moved or been deleted).
        const liveTask = task && task.projectId === project?.id ? task : undefined;
        const comment = liveTask && info.commentId ? commentById.get(info.commentId) : undefined;

        return {
            id,
            type,
            read: readAt !== null,
            createdAt: createdAt.toISOString(),
            timeLabel: timeAgo(createdAt),
            group: dayGroup(createdAt, now),
            actor: actor ? { name: actor.name?.trim() || actor.email, email: actor.email, image: actor.image } : null,
            verb: notificationVerb(type),
            taskTitle: liveTask?.title ?? (project ? (info.taskTitle ?? null) : null),
            projectName: project?.name ?? null,
            projectId: project?.id ?? null,
            snippet: comment && comment.taskId === liveTask?.id ? commentSnippet(comment.content) : null,
            href:
                liveTask && project
                    ? `/workspace/${project.workspace.slug}/project/${project.id}/tasks/${liveTask.id}`
                    : null,
        };
    });
}
