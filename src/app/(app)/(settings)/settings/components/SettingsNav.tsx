"use client";

import { useEffect, useState } from "react";

export type SettingsNavItem = { id: string; label: string };

/**
 * Jump links for the settings sections. Highlights the section in view.
 * Desktop: a sticky list beside the content. Phones: a sticky row of tabs.
 */
export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
    const [active, setActive] = useState(items[0]?.id);

    useEffect(() => {
        const sections = items
            .map((item) => document.getElementById(item.id))
            .filter((el): el is HTMLElement => el !== null);
        if (!sections.length || typeof IntersectionObserver === "undefined") return;

        // The section whose top crossed the upper third of the screen wins.
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActive(visible[0].target.id);
            },
            { rootMargin: "-15% 0px -65% 0px" },
        );
        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, [items]);

    return (
        <nav aria-label="Settings sections">
            <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
                {items.map((item) => {
                    const current = item.id === active;
                    return (
                        <li key={item.id} className="shrink-0">
                            <a
                                href={`#${item.id}`}
                                onClick={() => setActive(item.id)}
                                aria-current={current ? "location" : undefined}
                                className={`flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                                    current
                                        ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(23,26,33,0.08),0_0_0_1px_rgba(23,26,33,0.05)] dark:bg-white/[0.08] dark:shadow-none"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                } ${item.id === "delete-account" && !current ? "lg:mt-3 hover:text-danger" : ""}`}
                            >
                                {item.label}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
