"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/** Copies the task's address so it can be pasted in chat or email. */
export function CopyLinkButton() {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(window.location.href.split("?")[0]);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard blocked (e.g. insecure context); nothing useful to do.
        }
    }

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Link copied" : "Copy link to task"}
            title={copied ? "Copied" : "Copy link"}
            className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
        >
            {copied ? (
                <Check className="size-4 text-status-done" aria-hidden="true" />
            ) : (
                <Link2 className="size-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
        </button>
    );
}
