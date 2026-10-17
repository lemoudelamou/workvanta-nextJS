import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ablyRest } from "@/lib/realtime/ably";
import { userChannel } from "@/lib/realtime/channels";

export const dynamic = "force-dynamic";

// Short-lived, so a signed-out browser stops getting events soon after.
const TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * An Ably token request for the signed-in user, allowed only to subscribe to
 * their own channel. 204 means realtime is off.
 */
export async function GET() {
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ably = ablyRest();
    if (!ably) return new NextResponse(null, { status: 204 });

    const tokenRequest = await ably.auth.createTokenRequest({
        clientId: userId,
        capability: { [userChannel(userId)]: ["subscribe"] },
        ttl: TOKEN_TTL_MS,
    });

    return NextResponse.json(tokenRequest, { headers: { "Cache-Control": "no-store" } });
}
