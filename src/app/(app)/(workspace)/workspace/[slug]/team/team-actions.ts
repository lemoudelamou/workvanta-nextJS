"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

import { requireRole } from "@/lib/auth/team";
import { prisma } from "@/lib/db/prisma";
import { sendWorkspaceInvitationEmail } from "@/lib/email/mailer";

type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
type InviteRole = Exclude<WorkspaceRole, "OWNER">;

export type InviteTeamState = {
    success: boolean;
    message?: string;
    error?: string;
};

function isInviteRole(value: unknown): value is InviteRole {
    return (
        value === "ADMIN" ||
        value === "MEMBER" ||
        value === "GUEST"
    );
}

function teamPath(slug: string) {
    return `/workspace/${slug}/team`;
}

export async function inviteTeamAction(
    slug: string,
    _previousState: InviteTeamState,
    formData: FormData,
): Promise<InviteTeamState> {
    const membership = await requireRole(
        slug,
        ["OWNER", "ADMIN"],
    );

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

    if (!isInviteRole(roleValue)) {
        return {
            success: false,
            error: "Please select a valid role.",
        };
    }

    if (
        roleValue === "ADMIN" &&
        membership.role !== "OWNER"
    ) {
        return {
            success: false,
            error: "Only the workspace owner can invite administrators.",
        };
    }

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

    const expiresAt = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    let invitation;

    try {
        invitation = await prisma.invitation.create({
            data: {
                email,
                token,
                workspaceId,
                role: roleValue,
                expiresAt,
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
    const currentMembership = await requireRole(
        slug,
        ["OWNER"],
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
        throw new Error("You cannot change your own role.");
    }

    if (targetMembership.role === "OWNER") {
        throw new Error(
            "The workspace owner cannot be changed.",
        );
    }

    await prisma.workspaceMember.update({
        where: {
            id: targetMembership.id,
        },
        data: {
            role,
        },
    });

    revalidatePath(teamPath(slug));
}

export async function removeTeamAction(
    slug: string,
    memberId: string,
) {
    const currentMembership = await requireRole(
        slug,
        ["OWNER", "ADMIN"],
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
        throw new Error(
            "You cannot remove yourself from the workspace.",
        );
    }

    if (targetMembership.role === "OWNER") {
        throw new Error(
            "The workspace owner cannot be removed.",
        );
    }

    if (
        currentMembership.role === "ADMIN" &&
        targetMembership.role === "ADMIN"
    ) {
        throw new Error(
            "Admins cannot remove other administrators.",
        );
    }

    await prisma.workspaceMember.delete({
        where: {
            id: targetMembership.id,
        },
    });

    revalidatePath(teamPath(slug));
}

