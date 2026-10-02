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

import {
    rateLimit,
    rateLimitByIp,
} from "@/lib/redis/rate-limit";



const MAX_LOGIN_ATTEMPTS = 5;
const MAX_TWO_FACTOR_ATTEMPTS = 5;

const LOCKOUT_DURATION = 15 * 60 * 1000;


const LOGIN_IP_LIMIT = 10;
const LOGIN_IP_WINDOW = 20;


const LOGIN_EMAIL_LIMIT = 10;
const LOGIN_EMAIL_WINDOW = 5 * 60;


const TWO_FACTOR_IP_LIMIT = 30;
const TWO_FACTOR_IP_WINDOW = 60;


const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
    "workvanta-dummy-password",
    12,
);


class AuthFlowError extends Error { }

function loginFailure(error: string): LoginResult {
    return {
        success: false,
        requiresTwoFactor: false,
        rememberedDevice: false,
        error,
    };
}
function handleLoginError(
    error: unknown,
): LoginResult {
    if (error instanceof AuthFlowError) {
        return loginFailure(error.message);
    }

    console.error("LOGIN ERROR:", error);

    return loginFailure(
        "Something went wrong. Please try again.",
    );
}

function twoFactorFailure(
    error: string,
): TwoFactorResult {
    return {
        success: false,
        error,
    };
}


function handleTwoFactorError(
    error: unknown,
    logMessage: string,
): TwoFactorResult {
    if (error instanceof AuthFlowError) {
        return twoFactorFailure(error.message);
    }

    console.error(logMessage, error);

    return twoFactorFailure(
        "Something went wrong. Please try again.",
    );
}



async function checkLoginIpRateLimit() {
    const result = await rateLimitByIp(
        "rate-limit:login",
        {
            limit: LOGIN_IP_LIMIT,
            windowSeconds: LOGIN_IP_WINDOW,
        },
    );

    if (!result.success) {
        throw new AuthFlowError(
            "Too many login attempts. Please try again shortly.",
        );
    }
}



async function checkFailedLoginRateLimit(
    email: string,
) {
    const result = await rateLimit({
        key: `rate-limit:login:email:${email}`,
        limit: LOGIN_EMAIL_LIMIT,
        windowSeconds: LOGIN_EMAIL_WINDOW,
    });

    if (!result.success) {
        throw new AuthFlowError(
            "Too many login attempts. Please try again later.",
        );
    }
}

async function checkTwoFactorRateLimit() {
    const result = await rateLimitByIp(
        "rate-limit:2fa",
        {
            limit: TWO_FACTOR_IP_LIMIT,
            windowSeconds: TWO_FACTOR_IP_WINDOW,
        },
    );

    if (!result.success) {
        throw new AuthFlowError(
            "Too many verification attempts. Please try again shortly.",
        );
    }
}

async function recordFailedTwoFactorAttempt(
    challengeId: string,
) {
    const challenge =
        await prisma.twoFactorChallenge.update({
            where: {
                id: challengeId,
            },
            data: {
                failedAttempts: {
                    increment: 1,
                },
            },
            select: {
                failedAttempts: true,
            },
        });


    if (
        challenge.failedAttempts <
        MAX_TWO_FACTOR_ATTEMPTS
    ) {
        return;
    }


    await prisma.twoFactorChallenge.updateMany({
        where: {
            id: challengeId,
            consumedAt: null,
        },
        data: {
            consumedAt: new Date(),
        },
    });


    const cookieStore = await cookies();

    cookieStore.delete(
        TWO_FACTOR_CHALLENGE_COOKIE,
    );


    throw new AuthFlowError(
        "Too many failed attempts. Please sign in again.",
    );
}


async function consumeTwoFactorChallenge(
    challengeId: string,
) {
    const now = new Date();


    const result =
        await prisma.twoFactorChallenge.updateMany({
            where: {
                id: challengeId,
                consumedAt: null,
                expiresAt: {
                    gt: now,
                },
            },
            data: {
                consumedAt: now,
            },
        });


    if (result.count !== 1) {
        throw new AuthFlowError(
            "This verification request has already been used or expired.",
        );
    }


    const cookieStore = await cookies();

    cookieStore.delete(
        TWO_FACTOR_CHALLENGE_COOKIE,
    );
}


type LoginResult =
    | {
        success: true;
        requiresTwoFactor: boolean;
        rememberedDevice: boolean;
    }
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
    const failure = (
        error: string,
    ): LoginResult => ({
        success: false,
        requiresTwoFactor: false,
        rememberedDevice: false,
        error,
    });


    try {

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";


        const plainPassword =
            typeof password === "string"
                ? password
                : "";


        if (
            !normalizedEmail ||
            !plainPassword
        ) {
            return failure(
                "Enter your email and password.",
            );
        }


        if (plainPassword.length > 200) {
            return failure(
                "Invalid email or password.",
            );
        }


        await checkLoginIpRateLimit();


        const user =
            await prisma.user.findUnique({
                where: {
                    email: normalizedEmail,
                },
                select: {
                    id: true,
                    passwordHash: true,
                    failedLoginCount: true,
                    lockedUntil: true,
                    twoFactorAuth: {
                        select: {
                            enabled: true,
                        },
                    },
                },
            });

        if (
            user?.lockedUntil &&
            user.lockedUntil > new Date()
        ) {
            return failure(
                "Too many failed attempts. Try again in 15 minutes.",
            );
        }


        const passwordMatches =
            await bcrypt.compare(
                plainPassword,
                user?.passwordHash ??
                DUMMY_PASSWORD_HASH,
            );

        if (
            !user ||
            !user.passwordHash ||
            !passwordMatches
        ) {

            await checkFailedLoginRateLimit(
                normalizedEmail,
            );


            if (user) {
                const updatedUser =
                    await prisma.user.update({
                        where: {
                            id: user.id,
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
                    MAX_LOGIN_ATTEMPTS
                ) {
                    await prisma.user.update({
                        where: {
                            id: user.id,
                        },
                        data: {
                            failedLoginCount: 0,
                            lockedUntil:
                                new Date(
                                    Date.now() +
                                    LOCKOUT_DURATION,
                                ),
                        },
                    });
                }
            }


            return failure(
                "Invalid email or password.",
            );
        }

        if (
            user.failedLoginCount > 0 ||
            user.lockedUntil
        ) {
            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    failedLoginCount: 0,
                    lockedUntil: null,
                },
            });
        }

        if (user.twoFactorAuth?.enabled) {
            /*
             * Check whether this device was
             * previously remembered.
             */
            if (
                await hasValidRememberedDevice(
                    user.id,
                )
            ) {
                await createSession(
                    user.id,
                );


                return {
                    success: true,
                    requiresTwoFactor: false,
                    rememberedDevice: true,
                };
            }


            /*
             * Create a new 2FA challenge.
             */
            await createTwoFactorChallenge(
                user.id,
            );


            return {
                success: true,
                requiresTwoFactor: true,
                rememberedDevice: false,
            };
        }

        await createSession(
            user.id,
        );


        return {
            success: true,
            requiresTwoFactor: false,
            rememberedDevice: false,
        };
    } catch (error) {
        return handleLoginError(error);
    }
}

type TwoFactorResult =
    | {
        success: true;
        rememberedDevice: boolean;
    }
    | {
        success: false;
        error: string;
    };


export async function verifyLoginTwoFactor(
    code: string,
    rememberDevice = false,
): Promise<TwoFactorResult> {
    try {
        if (typeof code !== "string") {
            throw new AuthFlowError(
                "Invalid authentication code.",
            );
        }


        await checkTwoFactorRateLimit();


        const challenge =
            await getChallenge();


        if (!challenge) {
            throw new AuthFlowError(
                "Your sign-in attempt expired. Please sign in again.",
            );
        }


        // Get 2FA configuration
        const auth =
            await prisma.twoFactorAuth.findUnique({
                where: {
                    userId: challenge.userId,
                },
                select: {
                    enabled: true,
                    secretCiphertext: true,
                },
            });


        if (!auth?.enabled) {
            throw new AuthFlowError(
                "Two-factor authentication is no longer enabled.",
            );
        }


        // Decrypt secret
        const secret =
            decryptTwoFactorSecret(
                auth.secretCiphertext,
            );


        // Verify TOTP
        const codeIsValid =
            await verifyTwoFactorCode(
                secret,
                code,
            );


        // Invalid TOTP
        if (!codeIsValid) {
            await recordFailedTwoFactorAttempt(
                challenge.id,
            );


            throw new AuthFlowError(
                "Invalid authentication code.",
            );
        }


        // Consume challenge
        await consumeTwoFactorChallenge(
            challenge.id,
        );


        // Remember device
        if (rememberDevice) {
            await createTwoFactorRememberToken(
                challenge.userId,
            );
        }


        // Create session
        await createSession(
            challenge.userId,
        );


        return {
            success: true,
            rememberedDevice: rememberDevice,
        };
    } catch (error) {
        return handleTwoFactorError(
            error,
            "2FA VERIFY ERROR:",
        );
    }
}

export async function verifyLoginBackupCode(
    code: string,
    rememberDevice = false,
): Promise<TwoFactorResult> {
    try {
        if (typeof code !== "string") {
            throw new AuthFlowError(
                "Invalid backup code.",
            );
        }


        // Redis IP protection
        await checkTwoFactorRateLimit();


        // Get challenge
        const challenge =
            await getChallenge();


        if (!challenge) {
            throw new AuthFlowError(
                "Your sign-in attempt expired. Please sign in again.",
            );
        }


        // Get 2FA configuration
        const auth =
            await prisma.twoFactorAuth.findUnique({
                where: {
                    userId: challenge.userId,
                },
                select: {
                    id: true,
                    enabled: true,
                },
            });


        if (!auth?.enabled) {
            throw new AuthFlowError(
                "Two-factor authentication is no longer enabled.",
            );
        }


        // Hash supplied backup code
        const backupCodeHash =
            hashBackupCode(code);


        // Find unused backup code
        const backupCode =
            await prisma.twoFactorBackupCode.findFirst({
                where: {
                    twoFactorAuthId: auth.id,
                    codeHash: backupCodeHash,
                    usedAt: null,
                },
                select: {
                    id: true,
                },
            });


        // Invalid backup code
        if (!backupCode) {
            await recordFailedTwoFactorAttempt(
                challenge.id,
            );


            throw new AuthFlowError(
                "Invalid backup code.",
            );
        }


        const now = new Date();


        // ─────────────────────────────────────
        // Consume backup code + challenge
        // atomically
        // ─────────────────────────────────────

        await prisma.$transaction(
            async (tx) => {
                const backupCodeResult =
                    await tx.twoFactorBackupCode.updateMany({
                        where: {
                            id: backupCode.id,
                            usedAt: null,
                        },
                        data: {
                            usedAt: now,
                        },
                    });


                if (
                    backupCodeResult.count !== 1
                ) {
                    throw new AuthFlowError(
                        "This backup code has already been used.",
                    );
                }


                const challengeResult =
                    await tx.twoFactorChallenge.updateMany({
                        where: {
                            id: challenge.id,
                            consumedAt: null,
                            expiresAt: {
                                gt: now,
                            },
                        },
                        data: {
                            consumedAt: now,
                        },
                    });


                if (
                    challengeResult.count !== 1
                ) {
                    throw new AuthFlowError(
                        "This verification request has already been used or expired.",
                    );
                }
            },
        );


        // Delete challenge cookie
        const cookieStore = await cookies();

        cookieStore.delete(
            TWO_FACTOR_CHALLENGE_COOKIE,
        );


        // Remember device
        if (rememberDevice) {
            await createTwoFactorRememberToken(
                challenge.userId,
            );
        }


        // Create session
        await createSession(
            challenge.userId,
        );


        return {
            success: true,
            rememberedDevice: rememberDevice,
        };
    } catch (error) {
        return handleTwoFactorError(
            error,
            "2FA BACKUP CODE ERROR:",
        );
    }
}


export async function logout() {
    await destroyCurrentSession();

    redirect("/signin");
}