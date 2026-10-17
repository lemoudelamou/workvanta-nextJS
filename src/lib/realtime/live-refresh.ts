import { isInteracting, whenIdle } from "./interaction-lock";

export type TaskChanged = {
    projectId: string;
    taskId: string | null;
    kind: string;
    actorId: string | null;
};

/**
 * Does this change affect the page at `pathname`? True for any page of the
 * changed project (board, list, members, its tasks) and for My tasks.
 */
export function affectsPage(pathname: string, change: TaskChanged) {
    if (pathname === "/tasks") return true;
    return new RegExp(`^/workspace/[^/]+/project/${escapeRegExp(change.projectId)}(/|$)`).test(pathname);
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Coalesces bursts of changes into one refresh, waits for a drag to finish,
 * and holds off while the tab is in the background (refreshing when the
 * person comes back). Returns a cleanup function.
 */
export function createLiveRefresher(refresh: () => void, delayMs = 300) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;
    let cancelIdleWait: (() => void) | null = null;

    const run = () => {
        timer = null;
        if (document.visibilityState === "hidden") {
            pending = true;
            return;
        }
        if (isInteracting()) {
            cancelIdleWait?.();
            cancelIdleWait = whenIdle(() => {
                cancelIdleWait = null;
                schedule();
            });
            return;
        }
        pending = false;
        refresh();
    };

    const schedule = () => {
        pending = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(run, delayMs);
    };

    const onVisible = () => {
        if (document.visibilityState === "visible" && pending) schedule();
    };
    document.addEventListener("visibilitychange", onVisible);

    return {
        schedule,
        dispose() {
            if (timer) clearTimeout(timer);
            cancelIdleWait?.();
            document.removeEventListener("visibilitychange", onVisible);
        },
    };
}
