#!/usr/bin/env node
/**
 * Vercel's build step (`npm run vercel-build`, which Vercel runs instead of
 * `build` when it exists).
 *
 * Production deploys apply pending database migrations first, then build.
 * Preview deploys only build: they must never change the production
 * database, even when they share its DATABASE_URL.
 *
 * If migrating fails, the build fails, and Vercel keeps the current
 * production deployment live: new code never runs against an old schema.
 *
 * Environment:
 *   VERCEL_ENV            set by Vercel: "production", "preview" or "development"
 *   DATABASE_URL          the database to migrate
 *   DIRECT_DATABASE_URL   optional: a direct (unpooled) connection to use for
 *                         migrating, if DATABASE_URL goes through a pooler
 *   SKIP_MIGRATIONS=1     optional: build without migrating, as an escape hatch
 */
import { spawnSync } from "node:child_process";

/** Runs a command. With `capture`, also returns its output (for short commands only). */
function run(command, args, { env = process.env, capture = false } = {}) {
    console.log(`\n> ${command} ${args.join(" ")}`);
    const result = spawnSync(command, args, {
        stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
        env,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
    });
    if (capture) {
        process.stdout.write(result.stdout ?? "");
        process.stderr.write(result.stderr ?? "");
    }
    if (result.error) throw result.error;
    return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function fail(message) {
    console.error(`\n✖ ${message}`);
    process.exit(1);
}

const isProduction = process.env.VERCEL_ENV === "production";

if (!isProduction) {
    console.log(`Skipping database migrations: this is a ${process.env.VERCEL_ENV ?? "local"} build, not production.`);
} else if (process.env.SKIP_MIGRATIONS === "1") {
    console.log("Skipping database migrations: SKIP_MIGRATIONS=1 is set.");
} else {
    const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) fail("DATABASE_URL isn't set for Production in Vercel, so migrations can't run. Add it and redeploy.");

    const { ok, output } = run("npx", ["--no-install", "prisma", "migrate", "deploy"], {
        env: { ...process.env, DATABASE_URL: url },
        capture: true,
    });
    if (!ok) {
        if (output.includes("P3005")) {
            fail(
                [
                    "The production database already has tables but no migration history (it was set up with `prisma db push`).",
                    "Mark the migrations it already has as applied, once, from your machine with DATABASE_URL pointing at production:",
                    "  npx prisma migrate resolve --applied <migration folder name>   (for each migration already in the database)",
                    "then redeploy. Until then, the current production deployment stays live.",
                ].join("\n"),
            );
        }
        fail("Database migrations failed, so the build stopped. The current production deployment stays live.");
    }
}

const build = run("npx", ["--no-install", "next", "build"]);
if (!build.ok) process.exit(1);
