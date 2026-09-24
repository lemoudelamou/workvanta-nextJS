import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie-name";

export function proxy(request: NextRequest) {
    if (!request.cookies.has(SESSION_COOKIE)) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }
    return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };