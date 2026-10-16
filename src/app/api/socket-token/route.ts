import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { createSocketToken } from "@/lib/socket/token";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getSession();

    if (!session?.sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = createSocketToken(session.sessionId);

    return NextResponse.json(
        { token },
        { headers: { "Cache-Control": "no-store" } },
    );
}