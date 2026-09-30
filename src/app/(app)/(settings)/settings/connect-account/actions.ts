"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import {
    destroyAllSessions,
    getSession,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type SetPasswordResult =
    | { success: true }
    | { success: false; error: string };

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export async function setPassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
): Promise<SetPasswordResult> {
    const session = await getSession();

    if (!session) {
        redirect("/signin");
    }

    if (!newPassword) {
        return {
            success: false,
            error: "Create a password.",
        };
    }

    if (newPassword.length < 8) {
        return {
            success: false,
            error: "Password must be at least 8 characters long.",
        };
    }

    if (newPassword.length > 200) {
        return {
            success: false,
            error: "Password is too long.",
        };
    }

    if (!/[A-Z]/.test(newPassword)) {
        return {
            success: false,
            error: "Password must contain at least one uppercase letter.",
        };
    }

    if (!/[0-9]/.test(newPassword)) {
        return {
            success: false,
            error: "Password must contain at least one number.",
        };
    }

    if (newPassword !== confirmPassword) {
        return {
            success: false,
            error: "The passwords do not match.",
        };
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: session.user.id,
            },
            select: {
                passwordHash: true,
                failedLoginCount: true,
                lockedUntil: true,
            },
        });

        if (!user) {
            redirect("/signin");
        }

        // Existing passwords must be confirmed before they can
        // be replaced.
        if (user.passwordHash) {
            const isLocked =
                user.lockedUntil &&
                user.lockedUntil > new Date();

            if (isLocked) {
                return {
                    success: false,
                    error: "Too many failed attempts. Try again in 15 minutes.",
                };
            }

            const currentPasswordIsValid =
                currentPassword &&
                currentPassword.length <= 200 &&
                (await bcrypt.compare(
                    currentPassword,
                    user.passwordHash,
                ));

            if (!currentPasswordIsValid) {
                const updatedUser = await prisma.user.update({
                    where: {
                        id: session.user.id,
                    },
                    data: {
                        failedLoginCount: {
                            increment: 1,
                        },
                    },
                    select: {
                        failedLoginCount: true,
                    },
                });

                if (
                    updatedUser.failedLoginCount >=
                    MAX_FAILED_ATTEMPTS
                ) {
                    await prisma.user.update({
                        where: {
                            id: session.user.id,
                        },
                        data: {
                            failedLoginCount: 0,
                            lockedUntil: new Date(
                                Date.now() + LOCKOUT_DURATION,
                            ),
                        },
                    });
                }

                return {
                    success: false,
                    error: "Your current password is incorrect.",
                };
            }
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await prisma.$transaction([
            prisma.user.update({
                where: {
                    id: session.user.id,
                },
                data: {
                    passwordHash,
                    failedLoginCount: 0,
                    lockedUntil: null,
                },
            }),

            // Changing the password invalidates remembered 2FA devices.
            prisma.twoFactorRememberToken.deleteMany({
                where: {
                    userId: session.user.id,
                },
            }),
        ]);

        // Keep the current device signed in and invalidate all others.
        await destroyAllSessions(
            session.user.id,
            session.sessionId,
        );

        return {
            success: true,
        };
    } catch (error) {
        // Next.js uses a thrown error internally for redirect().
        if (
            error instanceof Error &&
            (error as { digest?: string }).digest?.startsWith(
                "NEXT_REDIRECT",
            )
        ) {
            throw error;
        }

        console.error("Failed to change password:", error);

        return {
            success: false,
            error: "Something went wrong. Please try again.",
        };
    }
}

