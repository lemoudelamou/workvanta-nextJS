import crypto from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import {
    rateLimit,
    rateLimitByIp,
} from "@/lib/redis/rate-limit";

const EMAIL_VERIFICATION_EXPIRATION_MINUTES = 30;



const EMAIL_VERIFICATION_IP_LIMIT = 10;
const EMAIL_VERIFICATION_IP_WINDOW = 10 * 60;

const EMAIL_VERIFICATION_EMAIL_LIMIT = 3;
const EMAIL_VERIFICATION_EMAIL_WINDOW = 30 * 60;


function getEmailRateLimitSecret(): string {
    const secret = process.env.EMAIL_RATE_LIMIT_SECRET;

    if (!secret) {
        throw new Error(
            "EMAIL_RATE_LIMIT_SECRET is not configured",
        );
    }

    return secret;
}



function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function hashToken(token: string): string {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

function hashEmailForRateLimit(email: string): string {
    return crypto
        .createHmac(
            "sha256",
            getEmailRateLimitSecret(),
        )
        .update(normalizeEmail(email))
        .digest("hex");
}


export async function createEmailVerificationToken(
    userId: string,
) {
  

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            email: true,
        },
    });

    if (!user) {
        throw new Error("User not found.");
    }

    const normalizedEmail = normalizeEmail(user.email);

  
    const ipRateLimit = await rateLimitByIp(
        "rate-limit:email-verification",
        {
            limit: EMAIL_VERIFICATION_IP_LIMIT,
            windowSeconds: EMAIL_VERIFICATION_IP_WINDOW,
        },
    );

    if (!ipRateLimit.success) {
        throw new Error(
            "Too many verification requests. Please try again later.",
        );
    }

  
    const emailHash = hashEmailForRateLimit(
        normalizedEmail,
    );

    const emailRateLimit = await rateLimit({
        key: `rate-limit:email-verification:email:${emailHash}`,
        limit: EMAIL_VERIFICATION_EMAIL_LIMIT,
        windowSeconds: EMAIL_VERIFICATION_EMAIL_WINDOW,
    });

    if (!emailRateLimit.success) {
        throw new Error(
            "Too many verification requests. Please try again later.",
        );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(
        Date.now() +
        EMAIL_VERIFICATION_EXPIRATION_MINUTES * 60 * 1000,
    );

    await prisma.emailVerificationToken.upsert({
        where: {
            userId,
        },

        create: {
            userId,
            tokenHash,
            expiresAt,
            usedAt: null,
        },

        update: {
            tokenHash,
            expiresAt,
            usedAt: null,
        },
    });


    return {
        token: rawToken,
        expiresAt,
        email: user.email,
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

    const now = new Date();

    return prisma.emailVerificationToken.updateMany({
        where: {
            tokenHash,
            usedAt: null,
            expiresAt: {
                gt: now,
            },
        },

        data: {
            usedAt: now,
        },
    });
}