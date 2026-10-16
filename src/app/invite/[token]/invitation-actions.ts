"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function acceptInvitationAction(token: string) {
    const session = await getSession();

    if (!session?.user?.id) {
        redirect(`/signin?callbackUrl=/invite/${token}`);
    }

    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { workspace: true, project: true },
    });

    if (!invitation) {
        throw new Error("Invitation not found.");
    }

    if (invitation.acceptedAt || invitation.expiresAt < new Date()) {
        throw new Error("This invitation is no longer available.");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        throw new Error("User account not found.");
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error("You must sign in with the invited email address.");
    }

    /*
     * Everything happens in one transaction, using upsert instead of
     * check-then-create. This closes the race condition where two
     * concurrent accepts (double click, retry) both pass an existence
     * check before either writes, then collide on the unique
     * [workspaceId, userId] / [projectId, userId] constraints.
     *
     * If they're already a member of the workspace and/or project,
     * we leave their existing role untouched rather than overwriting it.
     */
    await prisma.$transaction(async (tx) => {
        await tx.workspaceMember.upsert({
            where: {
                workspaceId_userId: {
                    workspaceId: invitation.workspaceId,
                    userId: user.id,
                },
            },
            update: {},
            create: {
                userId: user.id,
                workspaceId: invitation.workspaceId,
                role: invitation.role,
            },
        });

        if (invitation.projectId) {
            await tx.projectMember.upsert({
                where: {
                    projectId_userId: {
                        projectId: invitation.projectId,
                        userId: user.id,
                    },
                },
                update: {},
                create: {
                    projectId: invitation.projectId,
                    userId: user.id,
                    role: invitation.projectRole ?? "VIEWER",
                },
            });
        }

        await tx.invitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
        });
    });

    redirect(`/workspace/${invitation.workspace.slug}`);
}
