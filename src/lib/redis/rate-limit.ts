import { headers } from "next/headers";
import { getRedis } from "@/lib/redis/redis-connect";

type RateLimitOptions = {
    key: string;
    limit: number;
    windowSeconds: number;
};

export type RateLimitResult = {
    success: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    redisAvailable: boolean;
};

const rateLimitScript = `
local count = redis.call("INCR", KEYS[1])

if count == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
end

return count
`;

async function getClientIp(): Promise<string> {
    const headerStore = await headers();

    const forwardedFor = headerStore.get("x-forwarded-for");

    if (forwardedFor) {
        const ip = forwardedFor.split(",")[0]?.trim();

        if (ip) {
            return ip;
        }
    }

    const realIp = headerStore.get("x-real-ip");

    if (realIp) {
        return realIp.trim();
    }

    return "unknown";
}

export async function rateLimit({
    key,
    limit,
    windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
    try {
        const redis = await getRedis();

        const result = await redis.eval(
            rateLimitScript,
            [key],
            [windowSeconds * 1000],
        );

        const count = Number(result);

        if (!Number.isFinite(count)) {
            throw new Error("Invalid Redis rate limit response");
        }

        return {
            success: count <= limit,
            limit,
            remaining: Math.max(0, limit - count),
            resetAt: Date.now() + windowSeconds * 1000,
            redisAvailable: true,
        };
    } catch (error) {
        console.error("RATE LIMIT ERROR:", error);

        /*
         * Redis is an additional protection layer.
         *
         * The database-level protections in your authentication
         * system remain active:
         *
         * - failedLoginCount
         * - lockedUntil
         * - 2FA failedAttempts
         * - challenge expiration
         * - backup-code consumption
         *
         * Therefore we fail open here so that a Redis outage
         * cannot completely disable authentication.
         */

        return {
            success: true,
            limit,
            remaining: limit,
            resetAt: Date.now() + windowSeconds * 1000,
            redisAvailable: false,
        };
    }
}

export async function rateLimitByIp(
    prefix: string,
    options: Omit<RateLimitOptions, "key">,
): Promise<RateLimitResult> {
    const ip = await getClientIp();

    return rateLimit({
        ...options,
        key: `${prefix}:ip:${ip}`,
    });
}



