import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
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
 * Starts the flow: creates a random `state` (and a PKCE verifier),
 * stores them in a short-lived HttpOnly cookie, and redirects to the provider.
 *
 * ?intent=link connects the provider to the signed-in user instead of
 * logging someone in.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ provider: string }> },
) {
    const { provider } = await params;

    if (!isOAuthProvider(provider)) {
        redirect("/signin?error=oauth_invalid");
    }

    const rawIntent = new URL(request.url).searchParams.get("intent");
    const intent: "login" | "signup" | "link" =
        rawIntent === "link" ? "link" : rawIntent === "signup" ? "signup" : "login";

    if (!isProviderConfigured(provider)) {
        console.error(`OAuth: ${provider} client id/secret are not set`);

        redirect(
            intent === "link"
                ? `/settings?${provider}=config-error`
                : "/signin?error=oauth_not_configured",
        );
    }

    const session = await getSession();

    if (intent === "link") {
        if (!session) {
            redirect("/signin");
        }
    } else if (session) {
        redirect("/settings");
    }

    const state = crypto.randomBytes(32).toString("base64url");
    const { verifier, challenge } = createPkcePair();

    const cookieStore = await cookies();

    cookieStore.set(OAUTH_COOKIE, `${provider}.${state}.${verifier}.${intent}`, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
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

/**
 * DELETE /api/oauth/github
 * DELETE /api/oauth/google
 *
 * Disconnects the provider from the signed-in user.
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ provider: string }> },
) {
    try {
        const { provider } = await params;

        if (!isOAuthProvider(provider)) {
            return NextResponse.json(
                { error: "Unsupported provider" },
                { status: 400 },
            );
        }

        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                passwordHash: true,
                accounts: {
                    select: { id: true, provider: true },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const account = user.accounts.find((item) => item.provider === provider);

        if (!account) {
            return NextResponse.json(
                { error: `${provider} account is not connected` },
                { status: 404 },
            );
        }

        // Never remove the last way to sign in
        if (!user.passwordHash && user.accounts.length <= 1) {
            return NextResponse.json(
                {
                    error:
                        "You cannot disconnect your only sign-in method. Set a password or connect another account first.",
                },
                { status: 400 },
            );
        }

        await prisma.account.delete({ where: { id: account.id } });

        return NextResponse.json({ success: true, provider });
    } catch (error) {
        console.error("OAUTH DISCONNECT ERROR:", error);

        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
        );
    }
}