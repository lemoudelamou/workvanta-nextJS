import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { projectAudienceWhere } from "@/lib/auth/permissions";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";

export type TaskChangeKind =
    | "created"
    | "updated"
    | "moved"
    | "deleted"
    | "subtasks"
    | "attachments"
    | "comments";

/**
 * Tells everyone who can open the project that a task changed, so open
 * boards, lists and task pages refresh. Only the project's audience is
 * notified (private projects stay private), and the person who made the
 * change is named so their own tab doesn't refresh twice.
 *
 * Best-effort: the change is already saved, so a realtime outage is logged,
 * never thrown. Call it only after access to `projectId` was verified.
 */
export async function publishTaskChanged(
    projectId: string,
    change: { taskId?: string | null; kind: TaskChangeKind },
) {
    try {
        const [session, project] = await Promise.all([
            getSession(),
            prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true, workspaceId: true, visibility: true },
            }),
        ]);

        if (!project) return;

        const audience = await prisma.workspaceMember.findMany({
            where: projectAudienceWhere(project),
            select: { userId: true },
        });

        if (audience.length === 0) return;

        await publishRealtimeEvent({
            type: "task-changed",
            workspaceId: project.workspaceId,
            recipientIds: audience.map((member) => member.userId),
            data: {
                projectId: project.id,
                taskId: change.taskId ?? null,
                kind: change.kind,
                actorId: session?.user?.id ?? null,
            },
        });
    } catch (error) {
        console.error("Failed to publish task change:", error);
    }
}
