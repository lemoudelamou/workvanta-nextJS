/**
 * Environment for the end-to-end run. Everything points at local services
 * (Postgres, Redis, the in-test SMTP sink); secrets are throwaway values.
 * Override any of them with real environment variables if needed.
 */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_SOCKET_PORT = Number(process.env.E2E_SOCKET_PORT ?? 3999);
export const E2E_SMTP_PORT = Number(process.env.E2E_SMTP_PORT ?? 2525);
export const E2E_MAIL_DIR = process.env.E2E_MAIL_DIR ?? ".e2e-mail";

export const e2eEnv: Record<string, string> = {
    NODE_ENV: "production",
    DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        "postgresql://workvanta:workvanta@127.0.0.1:5432/workvanta",
    REDIS_URL: process.env.E2E_REDIS_URL ?? "redis://127.0.0.1:6379",
    NEXT_PUBLIC_APP_URL: `http://localhost:${E2E_PORT}`,
    NEXT_PUBLIC_SOCKET_URL: `http://localhost:${E2E_SOCKET_PORT}`,

    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(E2E_SMTP_PORT),
    SMTP_USER: "e2e",
    SMTP_PASSWORD: "e2e",
    SMTP_FROM: "Workvanta E2E <e2e@workvanta.test>",

    TWO_FACTOR_ENCRYPTION_KEY: "0".repeat(64),
    EMAIL_RATE_LIMIT_SECRET: "e2e-rate-limit-secret",
    SOCKET_AUTH_SECRET: "e2e-socket-secret",

    // Rate limiting fails open when Upstash is unreachable.
    UPSTASH_REDIS_REST_URL: "http://127.0.0.1:9",
    UPSTASH_REDIS_REST_TOKEN: "e2e",

    // Attachments aren't exercised end-to-end; the SDK only needs a value.
    CLOUDINARY_URL: "cloudinary://e2e:e2e@e2e",
};
