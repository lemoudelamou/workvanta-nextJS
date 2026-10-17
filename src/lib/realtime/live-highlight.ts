"use client";

import { useSyncExternalStore } from "react";

/**
 * Remembers which tasks a teammate changed in the last few seconds, so the
 * board and list can make them glow briefly after a live refresh. Fed by
 * the "Workvanta:task-changed" window event from RealtimeProvider (which
 * only fires for other people's changes).
 */
export const HIGHLIGHT_MS = 2600;

const EMPTY: ReadonlySet<string> = new Set();
let snapshot: ReadonlySet<string> = EMPTY;
const listeners = new Set<() => void>();
let attached = false;

function emit() {
    for (const listener of listeners) listener();
}

export function markChanged(taskId: string) {
    snapshot = new Set(snapshot).add(taskId);
    emit();
    setTimeout(() => {
        if (!snapshot.has(taskId)) return;
        const next = new Set(snapshot);
        next.delete(taskId);
        snapshot = next.size ? next : EMPTY;
        emit();
    }, HIGHLIGHT_MS);
}

function onTaskChanged(event: Event) {
    const taskId = (event as CustomEvent<{ taskId?: string | null }>).detail?.taskId;
    if (taskId) markChanged(taskId);
}

function subscribe(listener: () => void) {
    if (!attached && typeof window !== "undefined") {
        window.addEventListener("Workvanta:task-changed", onTaskChanged);
        attached = true;
    }
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Ids of tasks that just changed elsewhere. */
export function useLiveHighlights() {
    return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}
