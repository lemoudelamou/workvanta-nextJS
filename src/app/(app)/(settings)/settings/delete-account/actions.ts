"use server";

import { redirect } from "next/navigation";

import {
    destroyCurrentSession,
    getSession,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
    DELETE_CONFIRMATION,
    getOwnedWorkspaces,
} from "@/lib/account/owned-workspaces";

export type DeleteAccountResult = { error?: string };

/**
 * Deletes the signed-in user's account.
 *
 * Personal data is erased and the user row is anonymised rather than
 * removed: tasks, comments and activity they created in shared workspaces
 * keep pointing at it (shown as "Deleted user"), so teammates' history
 * stays intact.
 */
export async function deleteAccount(
    confirmation: string,
): Promise<DeleteAccountResult> {
    const session = await getSession();

    if (!session) {
        redirect("/signin");
    }

    if (confirmation !== DELETE_CONFIRMATION) {
        return { error: 'Type "DELETE" to confirm account deletion.' };
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });

    if (!user) {
        redirect("/signin");
    }

    const { shared, solo } = await getOwnedWorkspaces(userId);

    if (shared.length > 0) {
        const names = shared.map((w) => w.name).join(", ");
        return {
            error: `You still own workspaces other people use (${names}). Transfer ownership or delete them first.`,
        };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Workspaces only this user was in go away entirely.
            if (solo.length > 0) {
                await tx.workspace.deleteMany({
                    where: { id: { in: solo.map((w) => w.id) } },
                });
            }

            // 2. Leave every other workspace cleanly.
            await tx.task.updateMany({
                where: { assigneeId: userId },
                data: { assigneeId: null },
            });
            await tx.projectMember.deleteMany({ where: { userId } });
            await tx.workspaceMember.deleteMany({ where: { userId } });
            await tx.invitation.deleteMany({ where: { email: user.email } });

            // 3. Erase sign-in methods, security data and personal settings.
            await tx.session.deleteMany({ where: { userId } });
            await tx.account.deleteMany({ where: { userId } });
            await tx.twoFactorAuth.deleteMany({ where: { userId } });
            await tx.twoFactorChallenge.deleteMany({ where: { userId } });
            await tx.twoFactorRememberToken.deleteMany({ where: { userId } });
            await tx.emailVerificationToken.deleteMany({ where: { userId } });
            await tx.passwordResetToken.deleteMany({ where: { userId } });
            await tx.verificationToken.deleteMany({
                where: { identifier: user.email },
            });
            await tx.notification.deleteMany({ where: { userId } });
            await tx.notificationPreference.deleteMany({ where: { userId } });
            await tx.userPreference.deleteMany({ where: { userId } });

            // 4. Anonymise what remains so it can't be signed into or
            //    identified, and frees the email for a new sign-up.
            await tx.user.update({
                where: { id: userId },
                data: {
                    name: "Deleted user",
                    email: `deleted-${userId}@deleted.invalid`,
                    emailVerified: null,
                    image: null,
                    passwordHash: null,
                    failedLoginCount: 0,
                    lockedUntil: null,
                },
            });
        });
    } catch (error) {
        console.error("Failed to delete account:", error);
        return {
            error: "Something went wrong while deleting your account. Please try again.",
        };
    }

    await destroyCurrentSession();

    redirect("/signin?deleted=1");
}
