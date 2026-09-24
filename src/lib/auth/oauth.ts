import "server-only";

import crypto from "node:crypto";

export const OAUTH_COOKIE =
    process.env.NODE_ENV === "production"
        ? "__Host-workvanta-oauth"
        : "workvanta-oauth";

export type OAuthProvider = "google" | "github";

export function isOAuthProvider(value: string): value is OAuthProvider {
    return value === "google" || value === "github";
}

export type OAuthProfile = {
    id: string; // stable id from the provider
    email: string; // verified email
    name: string | null;
    image: string | null;
};

type ProviderConfig = {
    clientId: string | undefined;
    clientSecret: string | undefined;
    authorizationUrl: string;
    tokenUrl: string;
    scope: string;
    pkce: boolean;
};

function getConfig(provider: OAuthProvider): ProviderConfig {
    if (provider === "google") {
        return {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scope: "openid email profile",
            pkce: true,
        };
    }

    return {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        authorizationUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        scope: "read:user user:email",
        pkce: false,
    };
}

export function isProviderConfigured(provider: OAuthProvider) {
    const { clientId, clientSecret } = getConfig(provider);
    return Boolean(clientId && clientSecret);
}

/** Base URL used to build the redirect URI. It must match the provider console exactly. */
export function getAppUrl(request: Request) {
    return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export function getRedirectUri(provider: OAuthProvider, request: Request) {
    return `${getAppUrl(request)}/api/oauth/${provider}/callback`;
}

export function createPkcePair() {
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto
        .createHash("sha256")
        .update(verifier)
        .digest("base64url");

    return { verifier, challenge };
}

export function buildAuthorizationUrl(
    provider: OAuthProvider,
    redirectUri: string,
    state: string,
    codeChallenge: string,
) {
    const config = getConfig(provider);

    const params = new URLSearchParams({
        client_id: config.clientId ?? "",
        redirect_uri: redirectUri,
        scope: config.scope,
        state,
    });

    if (provider === "google") {
        params.set("response_type", "code");
        params.set("prompt", "select_account");
    }

    if (config.pkce) {
        params.set("code_challenge", codeChallenge);
        params.set("code_challenge_method", "S256");
    }

    return `${config.authorizationUrl}?${params.toString()}`;
}

async function exchangeCodeForToken(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    codeVerifier: string,
) {
    const config = getConfig(provider);

    const body = new URLSearchParams({
        client_id: config.clientId ?? "",
        client_secret: config.clientSecret ?? "",
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
    });

    if (config.pkce) {
        body.set("code_verifier", codeVerifier);
    }

    const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
    });

    const data = (await response.json()) as {
        access_token?: string;
        error?: string;
    };

    if (!response.ok || !data.access_token) {
        throw new Error(`Token exchange failed: ${data.error ?? response.status}`);
    }

    return data.access_token;
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
        },
    );

    if (!response.ok) throw new Error("Google profile request failed");

    const data = (await response.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
    };

    if (!data.sub || !data.email || data.email_verified !== true) {
        throw new Error("Google account has no verified email");
    }

    return {
        id: data.sub,
        email: data.email,
        name: data.name ?? null,
        image: data.picture ?? null,
    };
}

async function fetchGithubProfile(accessToken: string): Promise<OAuthProfile> {
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "workvanta",
    };

    const [userResponse, emailsResponse] = await Promise.all([
        fetch("https://api.github.com/user", {
            headers,
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
        }),
        fetch("https://api.github.com/user/emails", {
            headers,
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
        }),
    ]);

    if (!userResponse.ok || !emailsResponse.ok) {
        throw new Error("GitHub profile request failed");
    }

    const user = (await userResponse.json()) as {
        id?: number;
        login?: string;
        name?: string | null;
        avatar_url?: string;
    };

    const emails = (await emailsResponse.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
    }>;

    // Only trust an email GitHub has verified. Never use the public
    // profile email, because it is not necessarily verified.
    const verified =
        emails.find((item) => item.primary && item.verified) ??
        emails.find((item) => item.verified);

    if (!user.id || !verified) {
        throw new Error("GitHub account has no verified email");
    }

    return {
        id: String(user.id),
        email: verified.email,
        name: user.name ?? user.login ?? null,
        image: user.avatar_url ?? null,
    };
}

export async function getOAuthProfile(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    codeVerifier: string,
): Promise<OAuthProfile> {
    const accessToken = await exchangeCodeForToken(
        provider,
        code,
        redirectUri,
        codeVerifier,
    );

    return provider === "google"
        ? fetchGoogleProfile(accessToken)
        : fetchGithubProfile(accessToken);
}