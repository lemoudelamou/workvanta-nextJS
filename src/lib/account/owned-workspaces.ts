import "server-only";

import { prisma } from "@/lib/db/prisma";

export const DELETE_CONFIRMATION = "DELETE";

/** Workspaces the user owns, split by whether anyone else is in them. */
export async function getOwnedWorkspaces(userId: string) {
    const owned = await prisma.workspaceMember.findMany({
        where: { userId, role: "OWNER" },
        select: {
            workspace: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    _count: { select: { members: true } },
                },
            },
        },
    });

    const workspaces = owned.map(({ workspace }) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        memberCount: workspace._count.members,
    }));

    return {
        // Shared workspaces must be handed over (or deleted) first, so
        // deleting an account never destroys other people's work.
        shared: workspaces.filter((w) => w.memberCount > 1),
        // Workspaces only this user belongs to are removed with the account.
        solo: workspaces.filter((w) => w.memberCount <= 1),
    };
}
