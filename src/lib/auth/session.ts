import "server-only";

import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE } from "./cookie-name";

const IS_PROD = process.env.NODE_ENV === "production";



const ABSOLUTE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // hard limit: 30 days
const IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // logged out after 7 idle days
const TOUCH_INTERVAL_MS = 5 * 60 * 1000; // update lastUsedAt at most every 5 min
const MAX_SESSIONS_PER_USER = 10;

function sha256(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function getIpAddress(requestHeaders: Headers) {
    // On Vercel these headers are set by the platform and cannot be spoofed.
    // If you self-host, only trust them behind your own reverse proxy.
    const realIp = requestHeaders.get("x-real-ip");
    if (realIp) return realIp.trim();

    const forwardedFor = requestHeaders.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0].trim();

    return null;
}

function getDeviceAndBrowser(userAgent: string) {
    let device = "Desktop";
    if (/iphone/i.test(userAgent)) device = "iPhone";
    else if (/ipad/i.test(userAgent)) device = "iPad";
    else if (/android/i.test(userAgent) && /mobile/i.test(userAgent))
        device = "Android phone";
    else if (/android/i.test(userAgent)) device = "Android tablet";
    else if (/macintosh|mac os x/i.test(userAgent)) device = "Mac";
    else if (/windows/i.test(userAgent)) device = "Windows PC";
    else if (/linux/i.test(userAgent)) device = "Linux PC";

    let browser = "Unknown browser";
    if (/edg\//i.test(userAgent)) browser = "Microsoft Edge";
    else if (/chrome\//i.test(userAgent)) browser = "Google Chrome";
    else if (/firefox\//i.test(userAgent)) browser = "Mozilla Firefox";
    else if (/safari\//i.test(userAgent)) browser = "Safari";

    return { device, browser };
}

/**
 * Reads Vercel's built-in geolocation headers. Only populated on an
 * actual Vercel deployment — empty in local dev and behind other
 * proxies in front of Vercel (see
 * https://vercel.com/kb/guide/geo-ip-headers-geolocation-vercel-functions).
 * City names can be percent-encoded, so decode before storing.
 */
/**
 * Reads Vercel's built-in geolocation headers. Only populated on an
 * actual Vercel deployment — empty in local dev and behind other
 * proxies in front of Vercel (see
 * https://vercel.com/kb/guide/geo-ip-headers-geolocation-vercel-functions).
 * City names can be percent-encoded, so decode before storing.
 *
 * In local dev these headers don't exist at all, so a fixed fallback
 * is used instead — purely so "Location unavailable" doesn't show up
 * on every session while testing locally.
 */
function getGeoLocation(requestHeaders: Headers) {
    const rawCity = requestHeaders.get("x-vercel-ip-city");
    const rawRegion = requestHeaders.get("x-vercel-ip-country-region");
    const rawCountry = requestHeaders.get("x-vercel-ip-country");

    const city = rawCity ? decodeURIComponent(rawCity) : null;
    const region = rawRegion;
    const country = rawCountry;

    const hasRealGeo = Boolean(city || region || country);

    if (hasRealGeo || process.env.NODE_ENV === "production") {
        return { city, region, country };
    }

    // Dev-only fallback — never used in production, so a real visitor
    // missing geo data (e.g. behind a VPN Vercel can't resolve) still
    // correctly shows "Location unavailable" rather than a fake city.
    return { city: "Berlin", region: "B", country: "DE" };
}

/**
 * Creates a new session for a user who has fully authenticated
 * (password, and 2FA if enabled).
 *
 * - The raw token only exists in the cookie. The database stores its hash,
 *   so a database leak cannot be used to hijack sessions.
 * - Any previous session from this browser is destroyed first
 *   (prevents session fixation).
 */
export async function createSession(userId: string) {
    const cookieStore = await cookies();
    const requestHeaders = await headers();

    // Destroy the session this browser already had, if any
    const previousToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (previousToken) {
        await prisma.session.deleteMany({
            where: { tokenHash: sha256(previousToken) },
        });
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ABSOLUTE_LIFETIME_MS);

    const userAgent = requestHeaders.get("user-agent") ?? "";
    const { device, browser } = getDeviceAndBrowser(userAgent);
    const { city, region, country } = getGeoLocation(requestHeaders);

    await prisma.session.create({
        data: {
            tokenHash: sha256(rawToken),
            userId,
            expiresAt,
            lastUsedAt: now,
            device,
            browser,
            ipAddress: getIpAddress(requestHeaders),
            city,
            region,
            country,
        },
    });

    // Keep only the newest sessions per user
    const stale = await prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: MAX_SESSIONS_PER_USER,
        select: { id: true },
    });

    if (stale.length > 0) {
        await prisma.session.deleteMany({
            where: { id: { in: stale.map((s) => s.id) } },
        });
    }

    cookieStore.set(SESSION_COOKIE, rawToken, {
        httpOnly: true, // JavaScript cannot read it (blocks XSS theft)
        secure: IS_PROD, // HTTPS only in production
        sameSite: "lax", // not sent on cross-site POSTs (CSRF protection)
        path: "/",
        expires: expiresAt,
    });
}

/**
 * Returns the current session and user, or null.
 * Cached per request, so calling it many times is cheap.
 * Use this instead of auth() everywhere.
 */
export const getSession = cache(async () => {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (!rawToken) return null;

    const session = await prisma.session.findUnique({
        where: { tokenHash: sha256(rawToken) },
        select: {
            id: true,
            expiresAt: true,
            lastUsedAt: true,
            user: {
                select: { id: true, name: true, email: true, image: true },
            },
        },
    });

    if (!session) return null;

    const now = Date.now();

    const expired =
        session.expiresAt.getTime() <= now ||
        now - session.lastUsedAt.getTime() > IDLE_TIMEOUT_MS;

    if (expired) {
        await prisma.session.deleteMany({ where: { id: session.id } });
        return null;
    }

    // Cookies cannot be modified while rendering a page, so only the
    // database timestamp is refreshed (and not on every request).
    if (now - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
        await prisma.session
            .update({
                where: { id: session.id },
                data: { lastUsedAt: new Date() },
            })
            .catch(() => undefined);
    }

    return { sessionId: session.id, user: session.user };
});

/** Logs out this browser. Call from a server action. */
export async function destroyCurrentSession() {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (rawToken) {
        await prisma.session.deleteMany({
            where: { tokenHash: sha256(rawToken) },
        });
    }

    cookieStore.delete(SESSION_COOKIE);
}

/**
 * Logs the user out everywhere. Call this when the password changes,
 * 2FA is disabled, or the user clicks "sign out of all devices".
 * Pass keepSessionId to stay signed in on the current device.
 */
export async function destroyAllSessions(userId: string, keepSessionId?: string) {
    await prisma.session.deleteMany({
        where: {
            userId,
            ...(keepSessionId ? { id: { not: keepSessionId } } : {}),
        },
    });
}

/** Optional: run from a cron job to delete expired rows. */
export async function deleteExpiredSessions() {
    await prisma.session.deleteMany({
        where: { expiresAt: { lte: new Date() } },
    });
}