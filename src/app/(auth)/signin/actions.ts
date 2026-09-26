"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import {
    createSession,
    destroyCurrentSession,
} from "@/lib/auth/session";
import {
    decryptTwoFactorSecret,
    verifyTwoFactorCode,
    hashBackupCode,
} from "@/lib/auth/two-factor";
import {
    TWO_FACTOR_CHALLENGE_COOKIE,
    createTwoFactorChallenge,
    createTwoFactorRememberToken,
    getChallenge,
    hasValidRememberedDevice,
} from "@/lib/auth/two-factor-login";

// NOTE: a "use server" file may only export async server actions.
// Every export here is callable from the browser, so helpers live in
// "@/lib/auth/two-factor-login" instead.

const MAX_TWO_FACTOR_ATTEMPTS = 5;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Used when the email does not exist, so the response time is the same
// as for a real account (prevents finding out which emails are registered).
const DUMMY_HASH = bcrypt.hashSync("workvanta-dummy-password", 12);

/** Errors of this type are safe to show to the user. */
class AuthFlowError extends Error { }

function toErrorResult(error: unknown, logLabel: string) {
    if (error instanceof AuthFlowError) {
        return { success: false as const, error: error.message };
    }

    console.error(logLabel, error);

    return {
        success: false as const,
        error: "Something went wrong. Please try again.",
    };
}

/* ------------------------------------------------------------------ */
/* Challenge bookkeeping                                               */
/* ------------------------------------------------------------------ */

async function registerFailedAttempt(challengeId: string) {
    const updated = await prisma.twoFactorChallenge.update({
        where: { id: challengeId },
        data: { failedAttempts: { increment: 1 } },
        select: { failedAttempts: true },
    });

    if (updated.failedAttempts >= MAX_TWO_FACTOR_ATTEMPTS) {
        await prisma.twoFactorChallenge.updateMany({
            where: { id: challengeId, consumedAt: null },
            data: { consumedAt: new Date() },
        });

        const cookieStore = await cookies();
        cookieStore.delete(TWO_FACTOR_CHALLENGE_COOKIE);

        throw new AuthFlowError(
            "Too many failed attempts. Please sign in again.",
        );
    }
}

async function consumeChallenge(challengeId: string) {
    const consumedAt = new Date();

    const result = await prisma.twoFactorChallenge.updateMany({
        where: {
            id: challengeId,
            consumedAt: null,
            expiresAt: { gt: consumedAt },
        },
        data: { consumedAt },
    });

    if (result.count !== 1) {
        throw new AuthFlowError(
            "This verification request has already been used or expired.",
        );
    }

    const cookieStore = await cookies();
    cookieStore.delete(TWO_FACTOR_CHALLENGE_COOKIE);
}

/* ------------------------------------------------------------------ */
/* Password login                                                      */
/* ------------------------------------------------------------------ */

type LoginResult =
    | { success: true; requiresTwoFactor: boolean; rememberedDevice: boolean }
    | {
        success: false;
        requiresTwoFactor: false;
        rememberedDevice: false;
        error: string;
    };

export async function loginWithPassword(
    email: string,
    password: string,
): Promise<LoginResult> {
    const fail = (error: string): LoginResult => ({
        success: false,
        requiresTwoFactor: false,
        rememberedDevice: false,
        error,
    });

    try {
        const normalizedEmail =
            typeof email === "string" ? email.trim().toLowerCase() : "";
        const plainPassword = typeof password === "string" ? password : "";

        if (!normalizedEmail || !plainPassword) {
            return fail("Enter your email and password.");
        }

        // Prevent bcrypt DoS with huge inputs (bcrypt only uses 72 bytes anyway)
        if (plainPassword.length > 200) {
            return fail("Invalid email or password.");
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                passwordHash: true,
                failedLoginCount: true,
                lockedUntil: true,
                twoFactorAuth: { select: { enabled: true } },
            },
        });

        if (user?.lockedUntil && user.lockedUntil > new Date()) {
            return fail("Too many failed attempts. Try again in 15 minutes.");
        }

        // Always run bcrypt, even when the user does not exist
        const matches = await bcrypt.compare(
            plainPassword,
            user?.passwordHash ?? DUMMY_HASH,
        );

        if (!user || !user.passwordHash || !matches) {
            if (user) {
                const updated = await prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginCount: { increment: 1 } },
                    select: { failedLoginCount: true },
                });

                if (updated.failedLoginCount >= MAX_LOGIN_ATTEMPTS) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            failedLoginCount: 0,
                            lockedUntil: new Date(Date.now() + LOCKOUT_MS),
                        },
                    });
                }
            }

            return fail("Invalid email or password.");
        }

        // Correct password: reset the counters
        if (user.failedLoginCount > 0 || user.lockedUntil) {
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginCount: 0, lockedUntil: null },
            });
        }

        if (user.twoFactorAuth?.enabled) {
            if (await hasValidRememberedDevice(user.id)) {
                await createSession(user.id);
                return {
                    success: true,
                    requiresTwoFactor: false,
                    rememberedDevice: true,
                };
            }

            await createTwoFactorChallenge(user.id);
            return {
                success: true,
                requiresTwoFactor: true,
                rememberedDevice: false,
            };
        }

        await createSession(user.id);

        return {
            success: true,
            requiresTwoFactor: false,
            rememberedDevice: false,
        };
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return fail("Something went wrong. Please try again.");
    }
}

/* ------------------------------------------------------------------ */
/* 2FA verification (used by password AND Google/GitHub logins)        */
/* ------------------------------------------------------------------ */

type TwoFactorResult =
    | { success: true; rememberedDevice: boolean }
    | { success: false; error: string };

export async function verifyLoginTwoFactor(
    code: string,
    rememberDevice = false,
): Promise<TwoFactorResult> {
    try {
        if (typeof code !== "string") {
            throw new AuthFlowError("Invalid authentication code.");
        }

        const challenge = await getChallenge();

        if (!challenge) {
            throw new AuthFlowError(
                "Your sign-in attempt expired. Please sign in again.",
            );
        }

        const auth = await prisma.twoFactorAuth.findUnique({
            where: { userId: challenge.userId },
            select: { enabled: true, secretCiphertext: true },
        });

        if (!auth || !auth.enabled) {
            throw new AuthFlowError(
                "Two-factor authentication is no longer enabled.",
            );
        }

        const secret = decryptTwoFactorSecret(auth.secretCiphertext);
        const valid = await verifyTwoFactorCode(secret, code);

        if (!valid) {
            await registerFailedAttempt(challenge.id);
            throw new AuthFlowError("Invalid authentication code.");
        }

        await consumeChallenge(challenge.id);

        if (rememberDevice) {
            await createTwoFactorRememberToken(challenge.userId);
        }

        await createSession(challenge.userId);

        return { success: true, rememberedDevice: rememberDevice };
    } catch (error) {
        return toErrorResult(error, "2FA VERIFY ERROR:");
    }
}

export async function verifyLoginBackupCode(
    code: string,
    rememberDevice = false,
): Promise<TwoFactorResult> {
    try {
        if (typeof code !== "string") {
            throw new AuthFlowError("Invalid backup code.");
        }

        const challenge = await getChallenge();

        if (!challenge) {
            throw new AuthFlowError(
                "Your sign-in attempt expired. Please sign in again.",
            );
        }

        const auth = await prisma.twoFactorAuth.findUnique({
            where: { userId: challenge.userId },
            select: { id: true, enabled: true },
        });

        if (!auth || !auth.enabled) {
            throw new AuthFlowError(
                "Two-factor authentication is no longer enabled.",
            );
        }

        // One indexed lookup instead of loading and comparing every code
        const matchingCode = await prisma.twoFactorBackupCode.findFirst({
            where: {
                twoFactorAuthId: auth.id,
                codeHash: hashBackupCode(code),
                usedAt: null,
            },
            select: { id: true },
        });

        if (!matchingCode) {
            await registerFailedAttempt(challenge.id);
            throw new AuthFlowError("Invalid backup code.");
        }

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            const backupResult = await tx.twoFactorBackupCode.updateMany({
                where: { id: matchingCode.id, usedAt: null },
                data: { usedAt: now },
            });

            if (backupResult.count !== 1) {
                throw new AuthFlowError("This backup code has already been used.");
            }

            const challengeResult = await tx.twoFactorChallenge.updateMany({
                where: {
                    id: challenge.id,
                    consumedAt: null,
                    expiresAt: { gt: now },
                },
                data: { consumedAt: now },
            });

            if (challengeResult.count !== 1) {
                throw new AuthFlowError(
                    "This verification request has already been used or expired.",
                );
            }
        });

        const cookieStore = await cookies();
        cookieStore.delete(TWO_FACTOR_CHALLENGE_COOKIE);

        if (rememberDevice) {
            await createTwoFactorRememberToken(challenge.userId);
        }

        await createSession(challenge.userId);

        return { success: true, rememberedDevice: rememberDevice };
    } catch (error) {
        return toErrorResult(error, "2FA BACKUP CODE ERROR:");
    }
}

/* ------------------------------------------------------------------ */
/* Logout                                                              */
/* ------------------------------------------------------------------ */

export async function logout() {
    await destroyCurrentSession();
    redirect("/signin");
}