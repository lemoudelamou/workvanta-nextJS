"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";

import { requireMembership, requireWorkspacePermission } from "@/lib/auth/team";
import {
    canChangeWorkspaceRole,
    canRemoveWorkspaceMember,
    canWorkspace,
    ForbiddenError,
    invitableWorkspaceRoles,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { sendWorkspaceInvitationEmail } from "@/lib/email/mailer";
import { publishRealtimeEvent } from "@/lib/publisher/publisher";
import { revalidateAppShell } from "@/lib/navigation/revalidate-shell";

type InviteRole = Exclude<WorkspaceRoleName, "OWNER">;

export type InviteTeamState = {
    success: boolean;
    message?: string;
    error?: string;
};

export type ActionResult = { error?: string };

function isRedirectError(error: unknown) {
    const digest = (error as { digest?: unknown })?.digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/**
 * Runs an action and turns permission / validation errors into a returned
 * `{ error }` (thrown messages are hidden from the client in production).
 */
async function asActionResult(run: () => Promise<void>): Promise<ActionResult> {
    try {
        await run();
        return {};
    } catch (error) {
        if (isRedirectError(error)) throw error;
        // Only our own messages are user-safe; never echo database errors.
        if (error instanceof ForbiddenError || (error instanceof Error && error.name === "Error")) {
            return { error: error.message };
        }
        console.error("Team action failed:", error);
        return { error: "Something went wrong. Please try again." };
    }
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function teamPath(slug: string) {
    return `/workspace/${slug}/team`;
}

function revalidateWorkspace(slug: string) {
    revalidateAppShell();
    revalidatePath(teamPath(slug));
    revalidatePath(`/workspace/${slug}`);
    revalidatePath("/workspace");
    revalidatePath("/dashboard");
}

/**
 * Removes every trace of a user's access to a workspace: project roles,
 * task assignments and their realtime subscription. Workspace membership
 * itself is deleted by the caller inside the same transaction.
 */
async function revokeWorkspaceAccess(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    userId: string,
) {
    await tx.projectMember.deleteMany({
        where: { userId, project: { workspaceId } },
    });

    await tx.task.updateMany({
        where: { assigneeId: userId, project: { workspaceId } },
        data: { assigneeId: null },
    });
}

async function notifyAccessRevoked(workspaceId: string, userId: string) {
    try {
        await publishRealtimeEvent({
            type: "workspace-access-revoked",
            workspaceId,
            data: { userId },
        });
    } catch (error) {
        // Realtime is best-effort; the membership is already gone, so the
        // next request from that user is rejected regardless.
        console.error("Failed to publish access revocation:", error);
    }
}

export async function inviteTeamAction(
    slug: string,
    _previousState: InviteTeamState,
    formData: FormData,
): Promise<InviteTeamState> {
    let membership: Awaited<ReturnType<typeof requireMembership>>;

    try {
        membership = await requireWorkspacePermission(
            slug,
            "members.invite",
            "Only workspace owners and admins can invite people.",
        );
    } catch (error) {
        if (error instanceof ForbiddenError) {
            return { success: false, error: error.message };
        }
        throw error;
    }

    const emailValue = formData.get("email");
    const roleValue = formData.get("role");

    const email =
        typeof emailValue === "string"
            ? emailValue.trim().toLowerCase()
            : "";

    if (!email) {
        return {
            success: false,
            error: "Please enter an email address.",
        };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
            success: false,
            error: "Please enter a valid email address.",
        };
    }

    const allowedRoles = invitableWorkspaceRoles(membership.role);

    if (roleValue === "ADMIN" && !allowedRoles.includes("ADMIN")) {
        return {
            success: false,
            error: "Only the workspace owner can invite administrators.",
        };
    }

    if (!allowedRoles.includes(roleValue as InviteRole)) {
        return {
            success: false,
            error: "Please select a valid role.",
        };
    }

    const role = roleValue as InviteRole;
    const workspaceId = membership.workspace.id;

    const existingMember =
        await prisma.workspaceMember.findFirst({
            where: {
                workspaceId,
                user: {
                    email,
                },
            },
            select: {
                id: true,
            },
        });

    if (existingMember) {
        return {
            success: false,
            error: "This user is already a member of the workspace.",
        };
    }

    const now = new Date();

    await prisma.invitation.deleteMany({
        where: {
            workspaceId,
            email,
            acceptedAt: null,
            expiresAt: {
                lte: now,
            },
        },
    });

    const existingInvitation =
        await prisma.invitation.findFirst({
            where: {
                workspaceId,
                email,
                projectId: null,
                acceptedAt: null,
                expiresAt: {
                    gt: now,
                },
            },
            select: {
                id: true,
            },
        });

    if (existingInvitation) {
        return {
            success: false,
            error: "An active invitation has already been sent to this email.",
        };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);

    let invitation;

    try {
        invitation = await prisma.invitation.create({
            data: {
                email,
                token,
                workspaceId,
                role,
                expiresAt,
                invitedById: membership.userId,
            },
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                success: false,
                error: "An active invitation has already been sent to this email.",
            };
        }

        throw error;
    }

    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";

    const invitationUrl =
        `${appUrl}/invite/${invitation.token}`;

    try {
        await sendWorkspaceInvitationEmail({
            email,
            workspaceName: membership.workspace.name,
            invitationUrl,
            inviterName: membership.user.name ?? membership.user.email,
        });
    } catch (error) {
        console.error(
            "Failed to send workspace invitation email:",
            error,
        );

        await prisma.invitation.delete({
            where: {
                id: invitation.id,
            },
        });

        return {
            success: false,
            error: "Failed to send invitation email. Please try again.",
        };
    }

    revalidatePath(teamPath(slug));

    return {
        success: true,
        message: `Invitation sent successfully to ${email}.`,
    };
}

export async function updateTeamRole(
    slug: string,
    memberId: string,
    role: InviteRole,
) {
    const currentMembership = await requireWorkspacePermission(
        slug,
        "members.changeRole",
        "Only the workspace owner can change roles.",
    );

    const targetMembership =
        await prisma.workspaceMember.findFirst({
            where: {
                id: memberId,
                workspaceId: currentMembership.workspace.id,
            },
            select: {
                id: true,
                role: true,
            },
        });

    if (!targetMembership) {
        throw new Error("Member not found.");
    }

    if (targetMembership.id === currentMembership.id) {
        throw new ForbiddenError("You cannot change your own role.");
    }

    if (targetMembership.role === "OWNER") {
        throw new ForbiddenError(
            "The workspace owner cannot be changed. Transfer ownership instead.",
        );
    }

    // Server-side check of the *value*: the client must never be able to
    // promote someone to OWNER (or anything outside the enum).
    if (
        !canChangeWorkspaceRole(
            { role: currentMembership.role, memberId: currentMembership.id },
            { role: targetMembership.role, memberId: targetMembership.id },
            role,
        )
    ) {
        throw new ForbiddenError("Please select a valid role.");
    }

    await prisma.workspaceMember.update({
        where: {
            id: targetMembership.id,
        },
        data: {
            role,
        },
    });

    revalidateWorkspace(slug);
}

export async function removeTeamAction(
    slug: string,
    memberId: string,
) {
    const currentMembership = await requireWorkspacePermission(
        slug,
        "members.remove",
    );

    const targetMembership =
        await prisma.workspaceMember.findFirst({
            where: {
                id: memberId,
                workspaceId: currentMembership.workspace.id,
            },
            select: {
                id: true,
                role: true,
                userId: true,
            },
        });

    if (!targetMembership) {
        throw new Error("Member not found.");
    }

    if (targetMembership.id === currentMembership.id) {
        throw new ForbiddenError(
            "You cannot remove yourself from the workspace. Use “Leave workspace” instead.",
        );
    }

    if (targetMembership.role === "OWNER") {
        throw new ForbiddenError(
            "The workspace owner cannot be removed.",
        );
    }

    if (
        !canRemoveWorkspaceMember(
            { role: currentMembership.role, memberId: currentMembership.id },
            { role: targetMembership.role, memberId: targetMembership.id },
        )
    ) {
        throw new ForbiddenError(
            "Admins cannot remove other administrators.",
        );
    }

    const workspaceId = currentMembership.workspace.id;

    await prisma.$transaction(async (tx) => {
        await revokeWorkspaceAccess(tx, workspaceId, targetMembership.userId);
        await tx.workspaceMember.delete({
            where: {
                id: targetMembership.id,
            },
        });
    });

    await notifyAccessRevoked(workspaceId, targetMembership.userId);

    revalidateWorkspace(slug);
}

/** Any non-owner can leave a workspace on their own. */
export async function leaveWorkspaceAction(slug: string): Promise<ActionResult> {
    let membership: Awaited<ReturnType<typeof requireMembership>> | undefined;
    const result = await asActionResult(async () => {
        membership = await leaveWorkspace(slug);
    });
    if (result.error || !membership) return result;

    await notifyAccessRevoked(membership.workspace.id, membership.userId);

    revalidateAppShell();
    revalidatePath("/workspace");
    revalidatePath("/dashboard");
    redirect("/workspace");
}

async function leaveWorkspace(slug: string) {
    const membership = await requireMembership(slug);

    if (!canWorkspace(membership.role, "workspace.leave")) {
        throw new ForbiddenError(
            "Transfer ownership to someone else before leaving this workspace.",
        );
    }

    const workspaceId = membership.workspace.id;

    await prisma.$transaction(async (tx) => {
        await revokeWorkspaceAccess(tx, workspaceId, membership.userId);
        await tx.workspaceMember.delete({ where: { id: membership.id } });
    });

    return membership;
}

/**
 * Hands the workspace over to another member. The previous owner stays on
 * as ADMIN so they don't lose access to their own work.
 */
export async function transferOwnershipAction(
    slug: string,
    memberId: string,
): Promise<ActionResult> {
    return asActionResult(() => transferOwnership(slug, memberId));
}

async function transferOwnership(slug: string, memberId: string) {
    const currentMembership = await requireWorkspacePermission(
        slug,
        "workspace.transfer",
        "Only the workspace owner can transfer ownership.",
    );

    const target = await prisma.workspaceMember.findFirst({
        where: {
            id: memberId,
            workspaceId: currentMembership.workspace.id,
        },
        select: { id: true, role: true, userId: true },
    });

    if (!target) {
        throw new Error("Member not found.");
    }

    if (target.id === currentMembership.id) {
        throw new ForbiddenError("You already own this workspace.");
    }

    if (target.role === "GUEST") {
        throw new ForbiddenError(
            "Guests can't own a workspace. Change their role first.",
        );
    }

    await prisma.$transaction([
        prisma.workspaceMember.update({
            where: { id: currentMembership.id },
            data: { role: "ADMIN" },
        }),
        prisma.workspaceMember.update({
            where: { id: target.id },
            data: { role: "OWNER" },
        }),
        prisma.workspace.update({
            where: { id: currentMembership.workspace.id },
            data: { ownerId: target.userId },
        }),
    ]);

    revalidateWorkspace(slug);
}

/** Cancels a pending invitation (workspace- or project-level). */
export async function revokeInvitationAction(
    slug: string,
    invitationId: string,
): Promise<ActionResult> {
    return asActionResult(() => revokeInvitation(slug, invitationId));
}

async function revokeInvitation(slug: string, invitationId: string) {
    const membership = await requireWorkspacePermission(
        slug,
        "invitations.manage",
        "Only workspace owners and admins can manage invitations.",
    );

    const invitation = await prisma.invitation.findFirst({
        where: {
            id: invitationId,
            workspaceId: membership.workspace.id,
            acceptedAt: null,
        },
        select: { id: true, role: true },
    });

    if (!invitation) {
        throw new Error("Invitation not found.");
    }

    // Admins can't cancel an admin invitation the owner sent.
    if (invitation.role === "ADMIN" && membership.role !== "OWNER") {
        throw new ForbiddenError(
            "Only the workspace owner can cancel an administrator invitation.",
        );
    }

    await prisma.invitation.delete({ where: { id: invitation.id } });

    revalidatePath(teamPath(slug));
}
