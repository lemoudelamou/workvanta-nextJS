import { headers } from "next/headers";
import { redis } from "@/lib/redis/redis";

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



