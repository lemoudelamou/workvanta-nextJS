"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import {
    destroyAllSessions,
    getSession,
} from "@/lib/auth/session";
import {
    createTwoFactorQrCode,
    createTwoFactorSecret,
    decryptTwoFactorSecret,
    encryptTwoFactorSecret,
    generateBackupCodes,
    hashBackupCode,
    verifyTwoFactorCode,
} from "@/lib/auth/two-factor";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

type Failure = {
    success: false;
    error: string;
};

class UserFacingError extends Error { }

function handleError(
    error: unknown,
    message: string,
): Failure {
    if (error instanceof UserFacingError) {
        return {
            success: false,
            error: error.message,
        };
    }

    console.error(message, error);

    return {
        success: false,
        error: "Something went wrong. Please try again.",
    };
}

async function requireSession() {
    const session = await getSession();

    if (!session) {
        redirect("/signin");
    }

    return session;
}

async function checkLockout(userId: string) {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            lockedUntil: true,
        },
    });

    if (
        user?.lockedUntil &&
        user.lockedUntil > new Date()
    ) {
        throw new UserFacingError(
            "Too many failed attempts. Try again in 15 minutes.",
        );
    }
}

async function recordFailedAttempt(userId: string) {
    const user = await prisma.user.update({
        where: {
            id: userId,
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

    if (user.failedLoginCount >= MAX_ATTEMPTS) {
        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                failedLoginCount: 0,
                lockedUntil: new Date(
                    Date.now() + LOCKOUT_DURATION,
                ),
            },
        });
    }
}

async function clearFailedAttempts(userId: string) {
    await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            failedLoginCount: 0,
            lockedUntil: null,
        },
    });
}

function normalizeTotpCode(code: string) {
    return code.trim().replace(/\s+/g, "");
}

/*
 * Used when a real authenticator code is required.
 *
 * Backup codes are intentionally not accepted here because
 * this function is used for disabling 2FA.
 */
async function verifyTotpCode(
    userId: string,
    secretCiphertext: string,
    code: string,
) {
    await checkLockout(userId);

    const submittedCode = normalizeTotpCode(code);

    if (!/^\d{6}$/.test(submittedCode)) {
        throw new UserFacingError(
            "Enter the 6-digit code from your authenticator app. Backup codes can't be used to disable two-factor authentication.",
        );
    }

    const valid = await verifyTwoFactorCode(
        decryptTwoFactorSecret(secretCiphertext),
        submittedCode,
    );

    if (!valid) {
        await recordFailedAttempt(userId);

        throw new UserFacingError(
            "Invalid authentication code.",
        );
    }

    await clearFailedAttempts(userId);
}

/*
 * Used when either the authenticator code or a backup code
 * is allowed.
 *
 * A backup code is consumed atomically so two simultaneous
 * requests cannot successfully use the same code.
 */
async function verifyTwoFactorCodeOrBackup(
    userId: string,
    auth: {
        id: string;
        secretCiphertext: string;
    },
    code: string,
) {
    await checkLockout(userId);

    const submittedCode =
        typeof code === "string"
            ? code.trim()
            : "";

    if (!submittedCode) {
        throw new UserFacingError(
            "Enter your authenticator code or a backup code.",
        );
    }

    const totpCode = normalizeTotpCode(
        submittedCode,
    );

    if (/^\d{6}$/.test(totpCode)) {
        const valid = await verifyTwoFactorCode(
            decryptTwoFactorSecret(
                auth.secretCiphertext,
            ),
            totpCode,
        );

        if (!valid) {
            await recordFailedAttempt(userId);

            throw new UserFacingError(
                "Invalid code.",
            );
        }

        await clearFailedAttempts(userId);

        return;
    }

    const codeHash = hashBackupCode(
        submittedCode,
    );

    const backupCode =
        await prisma.twoFactorBackupCode.findFirst({
            where: {
                twoFactorAuthId: auth.id,
                codeHash,
                usedAt: null,
            },
            select: {
                id: true,
            },
        });

    if (!backupCode) {
        await recordFailedAttempt(userId);

        throw new UserFacingError(
            "Invalid code.",
        );
    }

    /*
     * Only one concurrent request can successfully
     * change usedAt from null to a timestamp.
     */
    const consumed =
        await prisma.twoFactorBackupCode.updateMany({
            where: {
                id: backupCode.id,
                usedAt: null,
            },
            data: {
                usedAt: new Date(),
            },
        });

    if (consumed.count !== 1) {
        await recordFailedAttempt(userId);

        throw new UserFacingError(
            "Invalid or already used backup code.",
        );
    }

    await clearFailedAttempts(userId);
}

type BeginSetupResult =
    | {
        success: true;
        qrCode: string;
        secret: string;
    }
    | Failure;

export async function beginTwoFactorSetup(): Promise<BeginSetupResult> {
    const session = await requireSession();

    try {
        const existingAuth =
            await prisma.twoFactorAuth.findUnique({
                where: {
                    userId: session.user.id,
                },
                select: {
                    enabled: true,
                },
            });

        if (existingAuth?.enabled) {
            throw new UserFacingError(
                "Two-factor authentication is already enabled.",
            );
        }

        const secret = createTwoFactorSecret();

        await prisma.twoFactorAuth.upsert({
            where: {
                userId: session.user.id,
            },
            create: {
                userId: session.user.id,
                secretCiphertext:
                    encryptTwoFactorSecret(secret),
                enabled: false,
            },
            update: {
                secretCiphertext:
                    encryptTwoFactorSecret(secret),
                enabled: false,
            },
        });

        const { qrCode } =
            await createTwoFactorQrCode(
                secret,
                session.user.email,
            );

        return {
            success: true,
            qrCode,
            secret,
        };
    } catch (error) {
        return handleError(
            error,
            "2FA BEGIN SETUP ERROR:",
        );
    }
}

type ConfirmSetupResult =
    | {
        success: true;
        backupCodes: string[];
    }
    | Failure;

export async function confirmTwoFactorSetup(
    code: string,
): Promise<ConfirmSetupResult> {
    const session = await requireSession();

    try {
        const submittedCode =
            typeof code === "string"
                ? normalizeTotpCode(code)
                : "";

        if (!/^\d{6}$/.test(submittedCode)) {
            throw new UserFacingError(
                "Enter the 6-digit authenticator code.",
            );
        }

        const auth =
            await prisma.twoFactorAuth.findUnique({
                where: {
                    userId: session.user.id,
                },
                select: {
                    id: true,
                    enabled: true,
                    secretCiphertext: true,
                },
            });

        if (!auth) {
            throw new UserFacingError(
                "Setup expired. Start the setup again.",
            );
        }

        if (auth.enabled) {
            throw new UserFacingError(
                "Two-factor authentication is already enabled.",
            );
        }

        await checkLockout(
            session.user.id,
        );

        const valid =
            await verifyTwoFactorCode(
                decryptTwoFactorSecret(
                    auth.secretCiphertext,
                ),
                submittedCode,
            );

        if (!valid) {
            await recordFailedAttempt(
                session.user.id,
            );

            throw new UserFacingError(
                "Invalid authentication code.",
            );
        }

        await clearFailedAttempts(
            session.user.id,
        );

        const {
            plaintextCodes,
            hashedCodes,
        } = generateBackupCodes();

        await prisma.$transaction([
            prisma.twoFactorBackupCode.deleteMany({
                where: {
                    twoFactorAuthId: auth.id,
                },
            }),

            prisma.twoFactorBackupCode.createMany({
                data: hashedCodes.map(
                    (codeHash) => ({
                        twoFactorAuthId:
                            auth.id,
                        codeHash,
                    }),
                ),
            }),

            prisma.twoFactorAuth.update({
                where: {
                    id: auth.id,
                },
                data: {
                    enabled: true,
                },
            }),
        ]);

        return {
            success: true,
            backupCodes: plaintextCodes,
        };
    } catch (error) {
        return handleError(
            error,
            "2FA CONFIRM SETUP ERROR:",
        );
    }
}

type DisableResult =
    | {
        success: true;
    }
    | Failure;

export async function disableTwoFactor(
    code: string,
): Promise<DisableResult> {
    const session = await requireSession();

    try {
        const auth =
            await prisma.twoFactorAuth.findUnique({
                where: {
                    userId: session.user.id,
                },
                select: {
                    id: true,
                    enabled: true,
                    secretCiphertext: true,
                },
            });

        if (!auth?.enabled) {
            throw new UserFacingError(
                "Two-factor authentication is not enabled.",
            );
        }

        await verifyTotpCode(
            session.user.id,
            auth.secretCiphertext,
            code,
        );

        await prisma.$transaction([
            prisma.twoFactorChallenge.deleteMany({
                where: {
                    userId: session.user.id,
                },
            }),

            prisma.twoFactorRememberToken.deleteMany({
                where: {
                    userId: session.user.id,
                },
            }),

            prisma.twoFactorAuth.delete({
                where: {
                    id: auth.id,
                },
            }),
        ]);

        // Keep this session active and sign out every other device.
        await destroyAllSessions(
            session.user.id,
            session.sessionId,
        );

        return {
            success: true,
        };
    } catch (error) {
        return handleError(
            error,
            "2FA DISABLE ERROR:",
        );
    }
}

type RegenerateResult =
    | {
        success: true;
        backupCodes: string[];
    }
    | Failure;

export async function regenerateBackupCodes(
    code: string,
): Promise<RegenerateResult> {
    const session = await requireSession();

    try {
        const auth =
            await prisma.twoFactorAuth.findUnique({
                where: {
                    userId: session.user.id,
                },
                select: {
                    id: true,
                    enabled: true,
                    secretCiphertext: true,
                },
            });

        if (!auth?.enabled) {
            throw new UserFacingError(
                "Two-factor authentication is not enabled.",
            );
        }

        await verifyTwoFactorCodeOrBackup(
            session.user.id,
            auth,
            code,
        );

        const {
            plaintextCodes,
            hashedCodes,
        } = generateBackupCodes();

        await prisma.$transaction([
            prisma.twoFactorBackupCode.deleteMany({
                where: {
                    twoFactorAuthId: auth.id,
                },
            }),

            prisma.twoFactorBackupCode.createMany({
                data: hashedCodes.map(
                    (codeHash) => ({
                        twoFactorAuthId:
                            auth.id,
                        codeHash,
                    }),
                ),
            }),
        ]);

        return {
            success: true,
            backupCodes: plaintextCodes,
        };
    } catch (error) {
        return handleError(
            error,
            "2FA REGENERATE ERROR:",
        );
    }
}

