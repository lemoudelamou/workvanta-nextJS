// Small, fixed set so Tailwind can see every class. Muted enough to sit
// beside the status colors without being mistaken for them.
const PROJECT_DOTS = [
    "bg-[#6d5efc]", // iris
    "bg-[#0891b2]", // cyan
    "bg-[#ea580c]", // orange
    "bg-[#db2777]", // pink
    "bg-[#16a34a]", // green
    "bg-[#9333ea]", // violet
    "bg-[#2563eb]", // blue
    "bg-[#ca8a04]", // gold
] as const;

/** Stable color for a project, derived from its id. */
export function projectDot(id: string) {
    // FNV-1a: ids that differ only in their last characters (as cuids do)
    // still spread across the palette.
    let hash = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        hash ^= id.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return PROJECT_DOTS[hash % PROJECT_DOTS.length];
}
