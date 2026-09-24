import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
    OAUTH_COOKIE,
    buildAuthorizationUrl,
    createPkcePair,
    getRedirectUri,
    isOAuthProvider,
    isProviderConfigured,
} from "@/lib/auth/oauth";

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * GET /api/oauth/google
 * GET /api/oauth/github
 *
 * Starts the login: creates a random `state` (and a PKCE verifier),
 * stores them in a short-lived HttpOnly cookie, and redirects to the provider.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ provider: string }> },
) {
    const { provider } = await params;

    if (!isOAuthProvider(provider)) {
        redirect("/signin?error=oauth_invalid");
    }

    if (!isProviderConfigured(provider)) {
        console.error(`OAuth: ${provider} client id/secret are not set`);
        redirect("/signin?error=oauth_not_configured");
    }

    // Already signed in
    if (await getSession()) {
        redirect("/dashboard");
    }

    const state = crypto.randomBytes(32).toString("base64url");
    const { verifier, challenge } = createPkcePair();

    const cookieStore = await cookies();

    // provider.state.verifier (base64url has no dots, so "." is a safe separator)
    cookieStore.set(OAUTH_COOKIE, `${provider}.${state}.${verifier}`, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax", // must be lax so it is sent when the provider redirects back
        path: "/",
        maxAge: 10 * 60,
    });

    redirect(
        buildAuthorizationUrl(
            provider,
            getRedirectUri(provider, request),
            state,
            challenge,
        ),
    );
}