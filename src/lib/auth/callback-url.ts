/**
 * Where to send a user after they sign in.
 *
 * Only same-site relative paths are accepted ("/invite/abc", "/workspace/x").
 * Anything else — absolute URLs, protocol-relative "//evil.com", backslash
 * tricks, or garbage — falls back to the default, so `callbackUrl` can never
 * be used as an open redirect.
 */
export const DEFAULT_LOGIN_REDIRECT = "/dashboard";

/** Short-lived cookie that carries the callback through the OAuth round trip. */
export const OAUTH_CALLBACK_COOKIE = "wv_oauth_callback";

export function safeCallbackUrl(
    value: string | null | undefined,
    fallback: string = DEFAULT_LOGIN_REDIRECT,
): string {
    if (typeof value !== "string") return fallback;

    const url = value.trim();

    if (
        !url.startsWith("/") ||
        url.startsWith("//") ||
        url.startsWith("/\\") ||
        url.includes("\\") ||
        /[\u0000-\u001f]/.test(url)
    ) {
        return fallback;
    }

    // Don't bounce people back into the auth pages after signing in.
    if (/^\/(signin|signup)(\/|\?|$)/.test(url)) return fallback;

    return url;
}

/** Appends `callbackUrl` to an auth page link when there is one worth keeping. */
export function withCallbackUrl(path: string, callbackUrl: string | null | undefined) {
    const safe = safeCallbackUrl(callbackUrl, "");
    if (!safe) return path;

    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}callbackUrl=${encodeURIComponent(safe)}`;
}
