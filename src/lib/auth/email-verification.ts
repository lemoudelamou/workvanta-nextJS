import crypto from "node:crypto";

import { prisma } from "@/lib/db/prisma";

const EMAIL_VERIFICATION_EXPIRATION_MINUTES = 30;

function hashToken(token: string) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

export async function createEmailVerificationToken(
    userId: string,
) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(
        Date.now() +
        EMAIL_VERIFICATION_EXPIRATION_MINUTES * 60 * 1000,
    );

    /*
     * Only one active verification token is kept
     * for a user at a time.
     */
    await prisma.emailVerificationToken.deleteMany({
        where: {
            userId,
        },
    });

    await prisma.emailVerificationToken.create({
        data: {
            userId,
            tokenHash,
            expiresAt,
        },
    });

    return {
        token: rawToken,
        expiresAt,
    };
}

export async function getEmailVerificationToken(
    token: string,
) {
    const tokenHash = hashToken(token);

    const verificationToken =
        await prisma.emailVerificationToken.findUnique({
            where: {
                tokenHash,
            },
            include: {
                user: true,
            },
        });

    if (!verificationToken) {
        return null;
    }

    if (verificationToken.usedAt) {
        return null;
    }

    if (verificationToken.expiresAt <= new Date()) {
        return null;
    }

    return verificationToken;
}

export async function consumeEmailVerificationToken(
    token: string,
) {
    const tokenHash = hashToken(token);

    return prisma.emailVerificationToken.updateMany({
        where: {
            tokenHash,
            usedAt: null,
            expiresAt: {
                gt: new Date(),
            },
        },
        data: {
            usedAt: new Date(),
        },
    });
}