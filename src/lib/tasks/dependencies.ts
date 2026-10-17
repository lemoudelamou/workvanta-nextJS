export type DependencyEdge = { blockedTaskId: string; blockingTaskId: string };

/**
 * Would "blockedId is blocked by blockingId" make a loop? It would if
 * blockingId already waits (directly or through a chain) on blockedId.
 */
export function wouldCreateCycle(edges: DependencyEdge[], blockedId: string, blockingId: string) {
    if (blockedId === blockingId) return true;

    const waitsOn = new Map<string, string[]>();
    for (const { blockedTaskId, blockingTaskId } of edges) {
        const list = waitsOn.get(blockedTaskId) ?? [];
        list.push(blockingTaskId);
        waitsOn.set(blockedTaskId, list);
    }

    const seen = new Set<string>();
    const queue = [blockingId];
    while (queue.length) {
        const id = queue.shift()!;
        if (id === blockedId) return true;
        if (seen.has(id)) continue;
        seen.add(id);
        queue.push(...(waitsOn.get(id) ?? []));
    }
    return false;
}

/** How many of a task's blockers are still open. */
export function openBlockerCount(blockers: { status: string }[]) {
    return blockers.filter((b) => b.status !== "DONE").length;
}
