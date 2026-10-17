"use client";

import { useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

/**
 * Wraps a server-rendered <ul> whose <li>s carry `data-search` text and
 * hides the ones that don't match what's typed. Search shows only when
 * the list is long enough to need it.
 */
export function SearchableList({
    children,
    count,
    placeholder,
    minToSearch = 6,
    header,
}: {
    children: ReactNode;
    count: number;
    placeholder: string;
    minToSearch?: number;
    /** Heading content shown beside the search box. */
    header: ReactNode;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState("");
    const [visible, setVisible] = useState(count);

    function search(value: string) {
        setQuery(value);
        const words = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let shown = 0;
        rootRef.current?.querySelectorAll<HTMLElement>("[data-search]").forEach((row) => {
            const match = words.every((word) => (row.dataset.search ?? "").toLowerCase().includes(word));
            row.hidden = !match;
            if (match) shown++;
        });
        setVisible(shown);
    }

    return (
        <div ref={rootRef}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                {header}
                {count >= minToSearch && (
                    <label className="relative block w-full sm:w-64">
                        <span className="sr-only">{placeholder}</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => search(event.target.value)}
                            placeholder={placeholder}
                            className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-brand focus:ring-4 focus:ring-brand/15"
                        />
                    </label>
                )}
            </div>
            {children}
            {visible === 0 && query && (
                <p className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
                    No one matches &ldquo;{query.trim()}&rdquo;.
                </p>
            )}
        </div>
    );
}
