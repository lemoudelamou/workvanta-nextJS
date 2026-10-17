"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { buttonStyles } from "@/app/style/button-style";

/**
 * What an error boundary shows: a calm explanation, a way to try again, and
 * the error's reference so support can find it in the logs. The error is
 * reported to Sentry (when it's set up).
 */
export function ErrorNotice({
    error,
    retry,
    homeHref = "/dashboard",
}: {
    error: Error & { digest?: string };
    retry: () => void;
    homeHref?: string;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <section role="alert" className="mx-auto mt-10 flex max-w-lg flex-col items-center px-2 py-12 text-center sm:mt-16">
            <span
                aria-hidden="true"
                className="mb-5 flex size-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"
            >
                <TriangleAlert className="size-5" />
            </span>

            <h1 className="text-xl font-semibold tracking-[-0.01em] text-foreground sm:text-2xl">Something went wrong</h1>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                This page couldn&apos;t load. It&apos;s usually temporary, so try again. Your work is saved.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => retry()} className={buttonStyles({ variant: "primary" })}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Try again
                </button>
                <Link href={homeHref} className={buttonStyles({ variant: "secondary" })}>
                    Go to dashboard
                </Link>
            </div>

            {error.digest && (
                <p className="mt-6 text-xs text-muted-foreground">
                    Reference: <code className="font-mono">{error.digest}</code>
                </p>
            )}
        </section>
    );
}
