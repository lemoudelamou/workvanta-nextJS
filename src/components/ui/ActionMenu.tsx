"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export type ActionMenuItem =
    | { kind?: "item"; label: string; icon?: ReactNode; href?: string; onSelect?: () => void; danger?: boolean }
    | { kind: "separator" };

/**
 * The "⋯" button for less frequent actions (rename, leave, delete…).
 * Arrow keys move between items, Escape or a click outside closes it.
 */
export function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
    const id = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    function menuItems() {
        return Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    }

    function show() {
        setOpen(true);
        requestAnimationFrame(() => menuItems()[0]?.focus());
    }

    function close() {
        setOpen(false);
        buttonRef.current?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
        const list = menuItems();
        const index = list.indexOf(document.activeElement as HTMLElement);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            list[(index + step + list.length) % list.length]?.focus();
        } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            list[event.key === "Home" ? 0 : list.length - 1]?.focus();
        } else if (event.key === "Escape") {
            event.preventDefault();
            close();
        } else if (event.key === "Tab") {
            setOpen(false);
        }
    }

    const itemClass = (danger?: boolean) =>
        `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium outline-none transition-colors [&>svg]:size-4 [&>svg]:shrink-0 ${
            danger
                ? "text-danger hover:bg-danger/10 focus-visible:bg-danger/10"
                : "text-foreground hover:bg-muted focus-visible:bg-muted [&>svg]:text-muted-foreground"
        }`;

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? id : undefined}
                title={label}
                onClick={() => (open ? close() : show())}
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(23,26,33,0.04)] outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
            >
                <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>

            {open && (
                <div
                    id={id}
                    role="menu"
                    aria-label={label}
                    onKeyDown={onKeyDown}
                    className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[0_16px_40px_-12px_rgba(15,17,21,0.28)] motion-safe:animate-[shell-pop_120ms_ease-out]"
                >
                    {items.map((item, index) =>
                        item.kind === "separator" ? (
                            <div key={`sep-${index}`} role="separator" className="my-1 h-px bg-border" />
                        ) : item.href ? (
                            <Link
                                key={item.label}
                                href={item.href}
                                role="menuitem"
                                tabIndex={-1}
                                onClick={() => setOpen(false)}
                                className={itemClass(item.danger)}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        ) : (
                            <button
                                key={item.label}
                                type="button"
                                role="menuitem"
                                tabIndex={-1}
                                onClick={() => {
                                    setOpen(false);
                                    item.onSelect?.();
                                }}
                                className={itemClass(item.danger)}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
