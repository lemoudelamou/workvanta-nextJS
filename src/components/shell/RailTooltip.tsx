"use client";

import { useState, type FocusEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";

type Anchor = { top: number; left: number };

/**
 * A label beside an icon in the collapsed sidebar, on hover and on keyboard
 * focus. It's drawn on top of the page, so the sidebar's scrolling list
 * can't cut it off. Purely visual: the item already carries the same name
 * for screen readers.
 *
 * Spread `handlers` on the item, render `tooltip` next to it, and call
 * `hide` when the item is clicked.
 */
export function useRailTooltip(label: string, enabled: boolean) {
    const [anchor, setAnchor] = useState<Anchor | null>(null);

    function show(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) {
        if (!enabled) return;
        // Keyboard focus only, not a mouse click that happens to focus.
        if (event.type === "focus" && !event.currentTarget.matches(":focus-visible")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setAnchor({ top: rect.top + rect.height / 2, left: rect.right + 10 });
    }

    const hide = () => setAnchor(null);

    return {
        handlers: { onMouseEnter: show, onFocus: show, onMouseLeave: hide, onBlur: hide },
        hide,
        tooltip:
            enabled && anchor
                ? createPortal(
                      <span
                          aria-hidden="true"
                          style={{ top: anchor.top, left: anchor.left }}
                          className="pointer-events-none fixed z-[70] -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg motion-safe:animate-[shell-pop_100ms_ease-out]"
                      >
                          {label}
                      </span>,
                      document.body,
                  )
                : null,
    };
}
