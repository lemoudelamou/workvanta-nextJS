"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

import { requireProjectPermission } from "@/lib/auth/members";
import {
    ForbiddenError,
    isProjectRole,
    isWorkspaceManager,
    type ProjectRoleName,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { sendProjectInvitationEmail } from "@/lib/email/mailer";

type ProjectRole = ProjectRoleName;

export type InviteProjectMemberState = {
    success: boolean;
    message?: string;
    error?: string;
};

function membersPath(slug: string, projectId: string) {
    return `/workspace/${slug}/project/${projectId}/members`;
}

export async function inviteToProjectAction(
    slug: string,
    projectId: string,
    _previousState: InviteProjectMemberState,
    formData: FormData,
): Promise<InviteProjectMemberState> {
    let access: Awaited<ReturnType<typeof requireProjectPermission>>;

    try {
        access = await requireProjectPermission(
            slug,
            projectId,
            "project.members.manage",
            "Only project admins can add people to this project.",
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

    if (!isProjectRole(roleValue)) {
        return {
            success: false,
            error: "Please select a valid role.",
        };
    }

    const existingUser = await prisma.user.findUnique({
        where: {
            email,
        },
        select: {
            id: true,
        },
    });

    if (existingUser?.id === access.userId) {
        return {
            success: false,
            error: "You're already on this project.",
        };
    }

    if (existingUser) {
        const workspaceMembership =
            await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: access.workspace.id,
                        userId: existingUser.id,
                    },
                },
                select: {
                    id: true,
                },
            });

        if (workspaceMembership) {
            await prisma.projectMember.upsert({
                where: {
                    projectId_userId: {
                        projectId: access.project.id,
                        userId: existingUser.id,
                    },
                },
                update: {
                    role: roleValue,
                },
                create: {
                    projectId: access.project.id,
                    userId: existingUser.id,
                    role: roleValue,
                },
            });

            revalidatePath(
                membersPath(slug, projectId),
            );

            return {
                success: true,
                message: `${email} was added to the project.`,
            };
        }
    }

    /*
     * Remove expired pending invitations first.
     *
     * PostgreSQL cannot use NOW() inside a partial unique index because
     * NOW() is not immutable. The database constraint therefore protects
     * all unaccepted invitations, while this cleanup makes expired
     * invitations available for reuse.
     */
    const now = new Date();

    await prisma.invitation.deleteMany({
        where: {
            workspaceId: access.workspace.id,
            projectId,
            email,
            acceptedAt: null,
            expiresAt: {
                lte: now,
            },
        },
    });

    /*
     * Check for an existing active invitation.
     */
    const existingInvitation = await prisma.invitation.findFirst({
        where: {
            workspaceId: access.workspace.id,
            projectId,
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
        /*
         * The invited user is not currently a workspace member.
         *
         * They receive GUEST workspace access and the selected project
         * role after accepting the invitation.
         */
        invitation = await prisma.invitation.create({
            data: {
                email,
                token,
                workspaceId: access.workspace.id,
                role: "GUEST",
                projectId,
                projectRole: roleValue,
                expiresAt,
            },
        });
    } catch (error) {
        /*
         * The unique database index protects us against two admins
         * sending the same invitation at the exact same time.
         */
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                success: false,
                error: "An invitation has already been sent to this email.",
            };
        }

        throw error;
    }

    const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://localhost:3000";

    const invitationUrl =
        `${appUrl}/invite/${invitation.token}`;


    const inviter = await prisma.user.findUnique({
        where: {
            id: access.userId,
        },
        select: {
            name: true,
        },
    });

    if (!inviter) {
        await prisma.invitation.delete({
            where: {
                id: invitation.id,
            },
        });

        return {
            success: false,
            error: "Unable to identify the inviter. Please try again.",
        };
    }


    try {
        await sendProjectInvitationEmail({
            email,
            workspaceName: access.workspace.name,
            projectName: access.project.name,
            invitationUrl,
            inviterName: inviter.name ?? "A team member",
        });
    } catch (error) {
        console.error(
            "Failed to send project invitation email:",
            error,
        );

        try {
            await prisma.invitation.delete({
                where: {
                    id: invitation.id,
                },
            });
        } catch (cleanupError) {
            console.error(
                "Failed to delete invitation after email failure:",
                cleanupError,
            );
        }

        return {
            success: false,
            error: "Failed to send invitation email. Please try again.",
        };
    }

    revalidatePath(
        membersPath(slug, projectId),
    );

    return {
        success: true,
        message: `Invitation sent successfully to ${email}.`,
    };
}

export async function updateProjectMemberRoleAction(
    slug: string,
    projectId: string,
    memberId: string,
    role: ProjectRole,
) {
    const access = await requireProjectPermission(
        slug,
        projectId,
        "project.members.manage",
    );

    if (!isProjectRole(role)) {
        throw new ForbiddenError("Please select a valid role.");
    }

    const member = await prisma.projectMember.findFirst({
        where: {
            id: memberId,
            projectId: access.project.id,
        },
        select: {
            id: true,
            userId: true,
        },
    });

    if (!member) {
        throw new Error("Project member not found.");
    }

    // Project admins can't demote themselves (and lock the project out of
    // an admin); workspace owners/admins always keep admin rights anyway.
    if (member.userId === access.userId && !isWorkspaceManager(access.workspaceRole)) {
        throw new ForbiddenError("You cannot change your own project role.");
    }

    await prisma.projectMember.update({
        where: {
            id: member.id,
        },
        data: {
            role,
        },
    });

    revalidatePath(
        membersPath(slug, projectId),
    );
}

export async function removeProjectMemberAction(
    slug: string,
    projectId: string,
    memberId: string,
) {
    const access = await requireProjectPermission(
        slug,
        projectId,
        "project.members.manage",
    );

    const member = await prisma.projectMember.findFirst({
        where: {
            id: memberId,
            projectId: access.project.id,
        },
        select: {
            id: true,
            userId: true,
        },
    });

    if (!member) {
        throw new Error("Project member not found.");
    }

    if (member.userId === access.userId) {
        throw new Error(
            "You cannot remove yourself from the project.",
        );
    }

    await prisma.projectMember.delete({
        where: {
            id: member.id,
        },
    });

    revalidatePath(
        membersPath(slug, projectId),
    );
}

