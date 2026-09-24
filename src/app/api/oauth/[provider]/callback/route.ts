import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSession } from "@/lib/auth/session";
import {
    OAUTH_COOKIE,
    getOAuthProfile,
    getRedirectUri,
    isOAuthProvider,
    type OAuthProfile,
    type OAuthProvider,
} from "@/lib/auth/oauth";

function safeEqual(a: string, b: string) {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return (
        bufferA.length === bufferB.length &&
        crypto.timingSafeEqual(bufferA, bufferB)
    );
}

/**
 * Finds or creates the user for this provider login and returns the user id.
 *
 * 1. Known provider account            -> that user
 * 2. Existing user with the same email -> link the provider to that user
 * 3. Otherwise                         -> create a new user
 *
 * Only emails the provider has verified ever reach this function.
 */
async function resolveUserId(provider: OAuthProvider, profile: OAuthProfile) {
    const existingAccount = await prisma.account.findUnique({
        where: {
            provider_providerAccountId: {
                provider,
                providerAccountId: profile.id,
            },
        },
        select: { userId: true },
    });

    if (existingAccount) {
        return existingAccount.userId;
    }

    const email = profile.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, emailVerified: true },
    });

    if (existingUser) {
        await prisma.$transaction(async (tx) => {
            await tx.account.create({
                data: {
                    userId: existingUser.id,
                    type: "oauth",
                    provider,
                    providerAccountId: profile.id,
                },
            });

            // The password account was never email-verified. Someone could have
            // registered this address before its real owner. The owner has now
            // proven control of the email through the provider, so remove the
            // old password and sign out every existing session.
            if (!existingUser.emailVerified) {
                await tx.user.update({
                    where: { id: existingUser.id },
                    data: { emailVerified: new Date(), passwordHash: null },
                });

                await tx.session.deleteMany({
                    where: { userId: existingUser.id },
                });
            }
        });

        return existingUser.id;
    }

    const user = await prisma.user.create({
        data: {
            name: profile.name,
            email,
            image: profile.image,
            emailVerified: new Date(),
            accounts: {
                create: {
                    type: "oauth",
                    provider,
                    providerAccountId: profile.id,
                },
            },
        },
        select: { id: true },
    });

    return user.id;
}

/**
 * GET /api/oauth/google/callback
 * GET /api/oauth/github/callback
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ provider: string }> },
) {
    const { provider } = await params;

    if (!isOAuthProvider(provider)) {
        redirect("/signin?error=oauth_invalid");
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const providerError = url.searchParams.get("error");

    // Read and immediately delete the one-time cookie
    const cookieStore = await cookies();
    const stored = cookieStore.get(OAUTH_COOKIE)?.value;
    cookieStore.delete(OAUTH_COOKIE);

    // User pressed "Cancel" at the provider
    if (providerError) {
        redirect("/signin?error=oauth_cancelled");
    }

    const [storedProvider, storedState, verifier] = (stored ?? "").split(".");

    // CSRF protection: the state we sent must match the one that came back
    if (
        !code ||
        !returnedState ||
        !storedState ||
        !verifier ||
        storedProvider !== provider ||
        !safeEqual(storedState, returnedState)
    ) {
        redirect("/signin?error=oauth_failed");
    }

    let errorCode: string | null = null;

    try {
        const profile = await getOAuthProfile(
            provider,
            code,
            getRedirectUri(provider, request),
            verifier,
        );

        const userId = await resolveUserId(provider, profile);

        await createSession(userId);
    } catch (error) {
        console.error("OAUTH CALLBACK ERROR:", error);

        const message = error instanceof Error ? error.message : "";

        errorCode = message.includes("no verified email")
            ? "oauth_no_email"
            : "oauth_failed";
    }

    // redirect() works by throwing, so it must stay outside the try/catch
    redirect(errorCode ? `/signin?error=${errorCode}` : "/dashboard");
}