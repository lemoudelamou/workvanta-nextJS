import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { WorkspaceRole } from "@/generated/prisma/client";
import {
    canWorkspace,
    ForbiddenError,
    type WorkspacePermission,
} from "@/lib/auth/permissions";

export async function requireMembership(
    slug: string,
) {
    const session = await getSession();

    if (!session?.user?.id) {
        redirect(`/signin?callbackUrl=${encodeURIComponent(`/workspace/${slug}`)}`);
    }

    const membership = await prisma.workspaceMember.findFirst({
        where: {
            userId: session.user.id,
            workspace: {
                slug,
            },
        },
        include: {
            workspace: true,
            user: true,
        },
    });

    if (!membership) {
        throw new ForbiddenError(
            "You do not have access to this workspace.",
        );
    }

    return membership;
}

export async function requireRole(
    slug: string,
    allowedRoles: WorkspaceRole[],
) {
    const membership =
        await requireMembership(slug);

    if (!allowedRoles.includes(membership.role)) {
        throw new ForbiddenError(
            "You do not have permission to perform this action.",
        );
    }

    return membership;
}

/** Ensures the current user holds a workspace permission. */
export async function requireWorkspacePermission(
    slug: string,
    permission: WorkspacePermission,
    message?: string,
) {
    const membership = await requireMembership(slug);

    if (!canWorkspace(membership.role, permission)) {
        throw new ForbiddenError(message);
    }

    return membership;
}
