import crypto from "node:crypto";

import { prisma } from "@/lib/db/prisma-client";

import { SESSION_COOKIE } from "@/lib/auth/cookie-name";

const IDLE_TIMEOUT =
    7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

function parseCookies(
    cookieHeader: string | undefined,
) {
    const cookies = new Map<
        string,
        string
    >();

    if (!cookieHeader) {
        return cookies;
    }

    for (const part of cookieHeader.split(";")) {
        const separator =
            part.indexOf("=");

        if (separator === -1) {
            continue;
        }

        const name = part
            .slice(0, separator)
            .trim();

        const value = part
            .slice(separator + 1)
            .trim();

        if (!name) {
            continue;
        }

        try {
            cookies.set(
                name,
                decodeURIComponent(value),
            );
        } catch {
            cookies.set(name, value);
        }
    }

    return cookies;
}

export async function authenticateSocketCookie(
    cookieHeader: string | undefined,
) {
    const cookies =
        parseCookies(cookieHeader);

    const token =
        cookies.get(SESSION_COOKIE);

    if (!token) {
        return null;
    }

    const tokenHash =
        hashToken(token);

    const session =
        await prisma.session.findUnique({
            where: {
                tokenHash,
            },
            select: {
                id: true,
                userId: true,
                expiresAt: true,
                lastUsedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });

    if (!session) {
        return null;
    }

    const now = Date.now();

    const hasExpired =
        session.expiresAt.getTime() <=
        now;

    const hasBeenIdle =
        now -
        session.lastUsedAt.getTime() >
        IDLE_TIMEOUT;

    if (hasExpired || hasBeenIdle) {
        await prisma.session.deleteMany({
            where: {
                id: session.id,
            },
        });

        return null;
    }

    return {
        sessionId: session.id,
        userId: session.userId,
        user: session.user,
    };
}

export { parseCookies };

