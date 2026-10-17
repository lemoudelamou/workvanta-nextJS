/**
 * Lets a component say "the user is in the middle of something" (dragging a
 * card) so live refreshes wait until they're done instead of yanking the
 * board from under the pointer.
 */
let holders = 0;
const listeners = new Set<() => void>();

export function beginInteraction() {
    holders += 1;
}

export function endInteraction() {
    holders = Math.max(0, holders - 1);
    if (holders === 0) {
        for (const listener of [...listeners]) listener();
    }
}

export function isInteracting() {
    return holders > 0;
}

/** Runs `callback` once nothing holds the lock (immediately if free). */
export function whenIdle(callback: () => void) {
    if (holders === 0) {
        callback();
        return () => {};
    }

    const once = () => {
        listeners.delete(once);
        callback();
    };
    listeners.add(once);
    return () => listeners.delete(once);
}
