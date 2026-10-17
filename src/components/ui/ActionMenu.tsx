"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export type ActionMenuItem =
    | { kind?: "item"; label: string; icon?: ReactNode; href?: string; onSelect?: () => void; danger?: boolean }
    | { kind: "separator" };

const GAP = 6;
const EDGE = 8;

/**
 * Where the open menu goes: under the button, right edges aligned, or above
 * it when there's no room below. Kept inside the window.
 */
export function placeMenu(button: DOMRect, menu: { width: number; height: number }, viewport: { width: number; height: number }) {
    const fitsBelow = button.bottom + GAP + menu.height <= viewport.height - EDGE;
    const fitsAbove = button.top - GAP - menu.height >= EDGE;
    const top = fitsBelow || !fitsAbove ? button.bottom + GAP : button.top - GAP - menu.height;
    const left = Math.min(Math.max(EDGE, button.right - menu.width), viewport.width - EDGE - menu.width);
    return { top, left };
}

/**
 * The "⋯" button for less frequent actions (rename, leave, delete…).
 * Arrow keys move between items, Escape or a click outside closes it.
 *
 * The open menu is drawn on top of the page (in a portal, fixed to the
 * button), so a list or card that hides its overflow can't cut it off.
 */
export function ActionMenu({
    label,
    items,
    variant = "outline",
}: {
    label: string;
    items: ActionMenuItem[];
    /** "ghost" for rows in a list, where a bordered button would be noisy. */
    variant?: "outline" | "ghost";
}) {
    const id = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: PointerEvent) {
            const target = event.target as Node;
            if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    // Place the menu next to its button, and keep it there while the page scrolls or resizes.
    // Written straight to the menu's style: it's layout, not app state.
    useLayoutEffect(() => {
        if (!open) return;
        function place() {
            const button = buttonRef.current?.getBoundingClientRect();
            const menu = menuRef.current;
            if (!button || !menu) return;
            const { top, left } = placeMenu(
                button,
                { width: menu.offsetWidth, height: menu.offsetHeight },
                { width: window.innerWidth, height: window.innerHeight },
            );
            menu.style.top = `${top}px`;
            menu.style.left = `${left}px`;
            menu.style.visibility = "visible";
        }
        place();
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [open]);

    function menuItems() {
        return Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
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
                className={`flex items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand ${
                    variant === "ghost"
                        ? "size-8"
                        : "size-9 border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]"
                }`}
            >
                <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    id={id}
                    role="menu"
                    aria-label={label}
                    onKeyDown={onKeyDown}
                    style={{ top: 0, left: 0, visibility: "hidden" }}
                    className="fixed z-[60] w-56 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[0_16px_40px_-12px_rgba(15,17,21,0.28)] motion-safe:animate-[shell-pop_120ms_ease-out]"
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
                </div>,
                document.body,
            )}
        </div>
    );
}
