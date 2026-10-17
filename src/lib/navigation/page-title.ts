import type { Metadata } from "next";

/**
 * "Task · Project · Workvanta": most specific first, so tabs stay tellable
 * apart. Kept free of imports so static pages can use it without loading
 * the database client.
 */
export function pageTitle(...parts: string[]): Metadata {
    return { title: [...parts, "Workvanta"].join(" · ") };
}
