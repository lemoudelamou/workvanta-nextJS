"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * The last resort, when the root layout itself fails. It replaces the whole
 * document, so the app's stylesheet isn't loaded: it's styled inline and
 * follows the system's light or dark mode.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    colorScheme: "light dark",
                    background: "Canvas",
                    color: "CanvasText",
                }}
            >
                <title>Something went wrong · Workvanta</title>
                <main role="alert" style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
                    <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
                    <p style={{ margin: "0 0 24px", lineHeight: 1.5, opacity: 0.75 }}>
                        Workvanta couldn&apos;t load. It&apos;s usually temporary, so try again in a moment.
                    </p>
                    <button
                        type="button"
                        onClick={() => retry()}
                        style={{
                            font: "inherit",
                            fontWeight: 600,
                            padding: "10px 18px",
                            borderRadius: 10,
                            border: "none",
                            background: "#4b3fd9", // the brand colour
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                    {error.digest && (
                        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>
                            Reference: <code>{error.digest}</code>
                        </p>
                    )}
                </main>
            </body>
        </html>
    );
}
