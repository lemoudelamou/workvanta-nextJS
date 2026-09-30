import { redis } from "@/lib/redis/redis";

export async function getRedis() {
    return redis;
}

