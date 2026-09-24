// "__Host-" prefix: browser only accepts the cookie if it is Secure,
// has Path=/ and no Domain, so subdomains cannot overwrite it.
export const SESSION_COOKIE =
    process.env.NODE_ENV === "production"
        ? "__Host-workvanta-session"
        : "workvanta-session";