import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie-name";

/**
 * Cheap, optimistic gate: bounce visitors without a session cookie to the
 * sign-in page before rendering any app route. The real checks (is the
 * session valid, what role does the user have) still run in every page and
 * server action — this only avoids rendering protected pages for guests.
 */
export function proxy(request: NextRequest) {
    if (!request.cookies.has(SESSION_COOKIE)) {
        const signInUrl = new URL("/signin", request.url);
        const { pathname, search } = request.nextUrl;
        signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
        return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/workspace/:path*",
        "/settings/:path*",
        "/notifications/:path*",
    ],
};
