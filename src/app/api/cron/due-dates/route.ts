import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { runDueDateSweep } from "@/lib/notifications/due-date-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Due-soon and overdue reminders. Schedule it every 15 minutes. */
async function handle(request: Request) {
    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await runDueDateSweep());
}

export { handle as GET, handle as POST };
