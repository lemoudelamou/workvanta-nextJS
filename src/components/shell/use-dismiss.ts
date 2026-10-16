"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes a popover on outside pointer-down or Escape. On Escape, focus goes
 * back to the trigger so keyboard users don't lose their place.
 */
export function useDismiss(
    open: boolean,
    close: () => void,
    containerRef: RefObject<HTMLElement | null>,
    triggerRef: RefObject<HTMLElement | null>,
) {
    useEffect(() => {
        if (!open) return;

        function onPointerDown(event: PointerEvent) {
            if (!containerRef.current?.contains(event.target as Node)) close();
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                close();
                triggerRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, close, containerRef, triggerRef]);
}
