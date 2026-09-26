import "server-only";

/**
 * Shared 2FA login helpers.
 *
 * These used to live inside app/signin/actions.ts, which is a "use server"
 * file. Every export of such a file becomes a public endpoint that any
 * client can call, so these helpers must NOT be exported from there. They
 * live here instead, where only server code can import them, and both the
 * password login and the OAuth callback use the same logic.
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

const IS_PROD = process.env.NODE_ENV === "production";

export const TWO_FACTOR_CHALLENGE_COOKIE = IS_PROD
    ? "__Host-workvanta-2fa-challenge"
    : "workvanta-2fa-challenge";

export const TWO_FACTOR_REMEMBER_COOKIE = IS_PROD
    ? "__Host-workvanta-2fa-remember"
    : "workvanta-2fa-remember";

const TWO_FACTOR_CHALLENGE_MINUTES = 5;
const TWO_FACTOR_REMEMBER_DAYS = 30;

export function sha256(value: string) {
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
/* Challenge (the "please enter your code" step)                       */
/* ------------------------------------------------------------------ */

export async function createTwoFactorChallenge(userId: string) {
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

export async function getChallenge() {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(TWO_FACTOR_CHALLENGE_COOKIE)?.value;

    if (!rawToken) return null;

    const challenge = await prisma.twoFactorChallenge.findUnique({
        where: { tokenHash: sha256(rawToken) },
    });

    if (
        !challenge ||
        challenge.consumedAt ||
        challenge.expiresAt <= new Date()
    ) {
        return null;
    }

    return challenge;
}

/* ------------------------------------------------------------------ */
/* "Remember this device"                                              */
/* ------------------------------------------------------------------ */

export async function createTwoFactorRememberToken(userId: string) {
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

export async function hasValidRememberedDevice(userId: string) {
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

/* ------------------------------------------------------------------ */
/* The gate: call this after ANY login method has verified the user    */
/* ------------------------------------------------------------------ */

/**
 * Returns true when the user must enter a 2FA code before getting a
 * session. In that case a challenge cookie has already been set and the
 * caller must NOT call createSession().
 *
 * Returns false when 2FA is off, or this device was remembered. The
 * caller can then create the session as usual.
 */
export async function beginTwoFactorIfRequired(
    userId: string,
): Promise<boolean> {
    const auth = await prisma.twoFactorAuth.findUnique({
        where: { userId },
        select: { enabled: true },
    });

    if (!auth?.enabled) {
        return false;
    }

    if (await hasValidRememberedDevice(userId)) {
        return false;
    }

    await createTwoFactorChallenge(userId);

    return true;
}