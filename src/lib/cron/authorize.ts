import crypto from "node:crypto";

/**
 * Scheduled jobs are plain routes, called by a scheduler (Upstash QStash,
 * Vercel Cron, ...) with `Authorization: Bearer <CRON_SECRET>`. Without a
 * CRON_SECRET nothing is allowed.
 */
export function isAuthorizedCronRequest(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const given = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
