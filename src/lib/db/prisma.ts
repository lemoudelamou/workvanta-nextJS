import "server-only";

/**
 * The Prisma client for the Next.js app. `server-only` makes the build fail
 * if this is ever imported from a client component.
 *
 * Standalone processes (the worker and the socket server) run outside
 * Next.js, where `server-only` can't be imported, so they use
 * `@/lib/db/prisma-client` directly. Both paths share one client instance.
 */
export { prisma } from "@/lib/db/prisma-client";
