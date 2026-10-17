"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * "⌘" on a Mac, "Ctrl" elsewhere, for showing shortcuts. The server can't
 * know, so it renders "Ctrl" and the browser corrects it after hydrating.
 */
export function useModKey() {
    return useSyncExternalStore(
        subscribe,
        () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"),
        () => "Ctrl",
    );
}
