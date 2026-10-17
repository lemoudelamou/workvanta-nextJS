"use client";

import { useEffect, useRef } from "react";
import { Keyboard, X } from "lucide-react";

import { SHORTCUTS, type Shortcut } from "@/lib/shortcuts";

function isMac() {
    return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

export function Key({ children }: { children: string }) {
    return (
        <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 font-sans text-xs font-medium text-foreground shadow-[inset_0_-1px_0_rgba(23,26,33,0.08)]">
            {children}
        </kbd>
    );
}

function Keys({ shortcut, mac }: { shortcut: Shortcut; mac: boolean }) {
    return (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            {shortcut.keys.map((key, index) => (
                <span key={key} className="flex items-center gap-1">
                    {index > 0 && <span>{shortcut.sequence ? "then" : "+"}</span>}
                    <Key>{key === "Mod" ? (mac ? "⌘" : "Ctrl") : key}</Key>
                </span>
            ))}
        </span>
    );
}

/** Every keyboard shortcut, grouped. Opens with "?" or from the account menu. */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
    const ref = useRef<HTMLDialogElement>(null);
    const mac = isMac();
    const groups = [...new Set(SHORTCUTS.map((s) => s.group))];

    useEffect(() => {
        const dialog = ref.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    return (
        <dialog
            ref={ref}
            aria-labelledby="shortcuts-title"
            onClose={onClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) event.currentTarget.close();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-[0_24px_64px_-12px_rgba(15,17,21,0.35)] backdrop:bg-[#0f1115]/40 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[shell-pop_140ms_ease-out]"
        >
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <h2 id="shortcuts-title" className="flex items-center gap-2 text-base font-semibold">
                    <Keyboard className="size-4 text-muted-foreground" aria-hidden="true" />
                    Keyboard shortcuts
                </h2>
                <button
                    type="button"
                    onClick={() => ref.current?.close()}
                    aria-label="Close"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>

            <div className="max-h-[min(70vh,32rem)] space-y-5 overflow-y-auto px-5 py-4">
                {groups.map((group) => (
                    <section key={group} aria-label={group}>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h3>
                        <ul className="mt-2 divide-y divide-border">
                            {SHORTCUTS.filter((s) => s.group === group).map((shortcut) => (
                                <li key={shortcut.label} className="flex items-center justify-between gap-4 py-2 text-sm">
                                    <span>{shortcut.label}</span>
                                    <Keys shortcut={shortcut} mac={mac} />
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                Shortcuts are paused while you type in a field.
            </p>
        </dialog>
    );
}
