import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { createSession, getSession } from "@/lib/auth/session";
import { beginTwoFactorIfRequired } from "@/lib/auth/two-factor-login";
import {
    OAUTH_COOKIE,
    getOAuthProfile,
    getRedirectUri,
    isOAuthProvider,
    type OAuthProfile,
    type OAuthProvider,
} from "@/lib/auth/oauth";

const SETTINGS_PATH = "/settings";
const LOGIN_SUCCESS_PATH = "/dashboard";

// The sign-in page shows the 2FA screen when it sees ?twoFactor=1
const TWO_FACTOR_PATH = "/signin?twoFactor=1";

/**
 * Status values understood by ProviderStatus on the settings page.
 * They are sent as ?github=<status> or ?google=<status>.
 */
type LinkStatus =
    | "connected"
    | "already-connected"
    | "already-used"
    | "invalid"
    | "expired"
    | "token-error"
    | "user-error"
    | "link-error";

function settingsUrl(provider: OAuthProvider, status: LinkStatus) {
    return `${SETTINGS_PATH}?${provider}=${status}`;
}

class LinkError extends Error {
    constructor(public status: LinkStatus) {
        super(status);
    }
}

class ExistingAccountError extends Error { }


function safeEqual(a: string, b: string) {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return (
        bufferA.length === bufferB.length &&
        crypto.timingSafeEqual(bufferA, bufferB)
    );
}

/**
 * LOGIN flow: finds or creates the user for this provider login.
 *
 * 1. Known provider account            -> that user
 * 2. Existing user with the same email -> link the provider to that user
 * 3. Otherwise                         -> create a new user
 *
 * Only emails the provider has verified ever reach this function.
 *
 * This function only identifies the user. It does NOT create a session:
 * the caller must pass the user through the 2FA gate first.
 */
async function resolveUserId(
    provider: OAuthProvider,
    profile: OAuthProfile,
    mode: "login" | "signup",
) {
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
        // Unverified squatted account: OAuth proves real ownership,
        // recover it regardless of whether this came from signup or login.
        if (!existingUser.emailVerified) {
            await prisma.$transaction(async (tx) => {
                await tx.account.create({
                    data: {
                        userId: existingUser.id,
                        type: "oauth",
                        provider,
                        providerAccountId: profile.id,
                    },
                });

                await tx.user.update({
                    where: { id: existingUser.id },
                    data: { emailVerified: new Date(), passwordHash: null },
                });

                await tx.session.deleteMany({ where: { userId: existingUser.id } });
                await tx.twoFactorAuth.deleteMany({ where: { userId: existingUser.id } });
                await tx.twoFactorRememberToken.deleteMany({ where: { userId: existingUser.id } });
                await tx.twoFactorChallenge.deleteMany({ where: { userId: existingUser.id } });
            });

            return existingUser.id;
        }

        // Verified account already exists.
        if (mode === "signup") {
            // Came from the signup page: don't auto-link, send them to sign in instead.
            throw new ExistingAccountError();
        }

        // Came from the signin page: this is normal login-via-OAuth, link and continue.
        await prisma.account.create({
            data: {
                userId: existingUser.id,
                type: "oauth",
                provider,
                providerAccountId: profile.id,
            },
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
 * LINK flow: attaches the provider to the signed-in user.
 * Never creates a user, never touches passwords or sessions.
 * (The user is already signed in, so they already passed 2FA.)
 */
async function linkToUser(
    provider: OAuthProvider,
    profile: OAuthProfile,
    userId: string,
): Promise<"connected" | "already-connected"> {
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
        if (existingAccount.userId === userId) {
            return "already-connected";
        }

        // This provider account belongs to someone else
        throw new LinkError("already-used");
    }

    // The user already has a different account of this provider
    const sameProvider = await prisma.account.findFirst({
        where: { userId, provider },
        select: { id: true },
    });

    if (sameProvider) {
        throw new LinkError("link-error");
    }

    await prisma.account.create({
        data: {
            userId,
            type: "oauth",
            provider,
            providerAccountId: profile.id,
        },
    });

    return "connected";
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

    const cookieStore = await cookies();
    const stored = cookieStore.get(OAUTH_COOKIE)?.value;
    cookieStore.delete(OAUTH_COOKIE);

    const [storedProvider, storedState, verifier, storedIntent] = (
        stored ?? ""
    ).split(".");

    const intent: "login" | "signup" | "link" =
        storedIntent === "link" ? "link" : storedIntent === "signup" ? "signup" : "login";

    // Where to go on failure: settings (link), signup, or signin
    const fail = (loginErrorCode: string, linkStatus: LinkStatus) => {
        if (intent === "link") return settingsUrl(provider, linkStatus);
        if (intent === "signup") return `/signup?error=${loginErrorCode}`;
        return `/signin?error=${loginErrorCode}`;
    };

    if (providerError) {
        redirect(fail("oauth_cancelled", "invalid"));
    }

    if (!stored) {
        redirect(fail("oauth_failed", "expired"));
    }

    if (
        !code ||
        !returnedState ||
        !storedState ||
        !verifier ||
        storedProvider !== provider ||
        !safeEqual(storedState, returnedState)
    ) {
        redirect(fail("oauth_failed", "invalid"));
    }

    let profile: OAuthProfile | undefined;
    let target = "";

    try {
        profile = await getOAuthProfile(
            provider,
            code,
            getRedirectUri(provider, request),
            verifier,
        );
    } catch (error) {
        console.error("OAUTH PROFILE ERROR:", error);

        const noEmail =
            error instanceof Error &&
            error.message.includes("no verified email");

        target = fail(
            noEmail ? "oauth_no_email" : "oauth_failed",
            noEmail ? "user-error" : "token-error",
        );
    }

    if (!profile) {
        redirect(target);
    }

    try {
        if (intent === "link") {
            const session = await getSession();

            if (!session) {
                target = "/signin";
            } else {
                const result = await linkToUser(provider, profile, session.user.id);

                target = settingsUrl(provider, result);
            }
        } else {
            const userId = await resolveUserId(
                provider,
                profile,
                intent === "signup" ? "signup" : "login",
            );

            if (await beginTwoFactorIfRequired(userId)) {
                target = TWO_FACTOR_PATH;
            } else {
                await createSession(userId);

                target = LOGIN_SUCCESS_PATH;
            }
        }
    } catch (error) {
        console.error("OAUTH CALLBACK ERROR:", error);

        if (error instanceof ExistingAccountError) {
            target = `/signup?error=account_exists&provider=${provider}`;
        } else if (error instanceof LinkError) {
            target = settingsUrl(provider, error.status);
        } else {
            target = fail("oauth_failed", "link-error");
        }
    }

    redirect(target);
}