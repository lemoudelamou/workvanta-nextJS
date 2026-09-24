"use server";

import crypto from "node:crypto";
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
    verifyBackupCode,
} from "@/lib/auth/two-factor";

const IS_PROD = process.env.NODE_ENV === "production";

const TWO_FACTOR_CHALLENGE_COOKIE = IS_PROD
    ? "__Host-workvanta-2fa-challenge"
    : "workvanta-2fa-challenge";
const TWO_FACTOR_REMEMBER_COOKIE = IS_PROD
    ? "__Host-workvanta-2fa-remember"
    : "workvanta-2fa-remember";

const TWO_FACTOR_CHALLENGE_MINUTES = 5;
const TWO_FACTOR_REMEMBER_DAYS = 30;
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

function sha256(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function getCookieOptions(expires: Date) {
    return {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: IS_PROD,
        path: "/",
        expires,
    };
}

/* ------------------------------------------------------------------ */
/* 2FA helpers                                                         */
/* ------------------------------------------------------------------ */

async function createTwoFactorChallenge(userId: string) {
    await prisma.twoFactorChallenge.deleteMany({ where: { userId } });

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(
        Date.now() + TWO_FACTOR_CHALLENGE_MINUTES * 60 * 1000,
    );

    await prisma.twoFactorChallenge.create({
        data: { userId, tokenHash: sha256(rawToken), expiresAt },
    });

    const cookieStore = await cookies();
    cookieStore.set(
        TWO_FACTOR_CHALLENGE_COOKIE,
        rawToken,
        getCookieOptions(expiresAt),
    );
}

async function createTwoFactorRememberToken(userId: string) {
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(
        Date.now() + TWO_FACTOR_REMEMBER_DAYS * 24 * 60 * 60 * 1000,
    );

    await prisma.twoFactorRememberToken.create({
        data: { userId, tokenHash: sha256(rawToken), expiresAt },
    });

    const cookieStore = await cookies();
    cookieStore.set(
        TWO_FACTOR_REMEMBER_COOKIE,
        rawToken,
        getCookieOptions(expiresAt),
    );
}

async function hasValidRememberedDevice(userId: string) {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(TWO_FACTOR_REMEMBER_COOKIE)?.value;

    if (!rawToken) return false;

    const remembered = await prisma.twoFactorRememberToken.findUnique({
        where: { tokenHash: sha256(rawToken) },
    });

    if (!remembered) {
        cookieStore.delete(TWO_FACTOR_REMEMBER_COOKIE);
        return false;
    }

    if (remembered.userId !== userId || remembered.expiresAt <= new Date()) {
        await prisma.twoFactorRememberToken.deleteMany({
            where: { id: remembered.id },
        });
        cookieStore.delete(TWO_FACTOR_REMEMBER_COOKIE);
        return false;
    }

    return true;
}

/** Call when 2FA is disabled. */
export async function revokeAllTwoFactorRememberTokens(userId: string) {
    await prisma.twoFactorRememberToken.deleteMany({ where: { userId } });

    const cookieStore = await cookies();
    cookieStore.delete(TWO_FACTOR_REMEMBER_COOKIE);
}

async function getChallenge() {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(TWO_FACTOR_CHALLENGE_COOKIE)?.value;

    if (!rawToken) return null;

    const challenge = await prisma.twoFactorChallenge.findUnique({
        where: { tokenHash: sha256(rawToken) },
    });

    if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date()) {
        return null;
    }

    return challenge;
}

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
/* 2FA verification                                                    */
/* ------------------------------------------------------------------ */

type TwoFactorResult =
    | { success: true; rememberedDevice: boolean }
    | { success: false; error: string };

export async function verifyLoginTwoFactor(
    code: string,
    rememberDevice = false,
): Promise<TwoFactorResult> {
    try {
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
        const challenge = await getChallenge();

        if (!challenge) {
            throw new AuthFlowError(
                "Your sign-in attempt expired. Please sign in again.",
            );
        }

        const auth = await prisma.twoFactorAuth.findUnique({
            where: { userId: challenge.userId },
            select: {
                enabled: true,
                backupCodes: {
                    where: { usedAt: null },
                    select: { id: true, codeHash: true },
                },
            },
        });

        if (!auth || !auth.enabled) {
            throw new AuthFlowError(
                "Two-factor authentication is no longer enabled.",
            );
        }

        const matched = await verifyBackupCode(
            code,
            auth.backupCodes.map((backup) => backup.codeHash),
        );

        const matchingCode = matched
            ? auth.backupCodes.find((backup) => backup.codeHash === matched)
            : undefined;

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