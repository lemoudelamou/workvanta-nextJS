import crypto from "node:crypto";

import { prisma } from "@/lib/db/prisma";

const PASSWORD_RESET_EXPIRATION_MINUTES = 30;

function hashToken(token: string) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

export async function createPasswordResetToken(userId: string) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(
        Date.now() +
        PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000,
    );

    await prisma.passwordResetToken.deleteMany({
        where: {
            userId,
        },
    });

    await prisma.passwordResetToken.create({
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

export async function getPasswordResetToken(token: string) {
    const tokenHash = hashToken(token);

    const resetToken = await prisma.passwordResetToken.findUnique({
        where: {
            tokenHash,
        },
        include: {
            user: true,
        },
    });

    if (!resetToken) {
        return null;
    }

    if (resetToken.usedAt) {
        return null;
    }

    if (resetToken.expiresAt <= new Date()) {
        return null;
    }

    return resetToken;
}

export async function consumePasswordResetToken(token: string) {
    const tokenHash = hashToken(token);

    return prisma.passwordResetToken.updateMany({
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