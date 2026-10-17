import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { runDailyDigest } from "@/lib/notifications/due-date-jobs";
import { redis } from "@/lib/redis/redis";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The morning digest email. Schedule it once a day; repeat calls on the same day send nothing. */
async function handle(request: Request) {
    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await runDailyDigest(redis));
}

export { handle as GET, handle as POST };
