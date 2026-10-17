// Small, fixed set so Tailwind can see every class. Muted enough to sit
// beside the status colors without being mistaken for them.
const PROJECT_HEX = [
    "#6d5efc", // iris
    "#0891b2", // cyan
    "#ea580c", // orange
    "#db2777", // pink
    "#16a34a", // green
    "#9333ea", // violet
    "#2563eb", // blue
    "#ca8a04", // gold
] as const;

const PROJECT_DOTS = [
    "bg-[#6d5efc]",
    "bg-[#0891b2]",
    "bg-[#ea580c]",
    "bg-[#db2777]",
    "bg-[#16a34a]",
    "bg-[#9333ea]",
    "bg-[#2563eb]",
    "bg-[#ca8a04]",
] as const;

function paletteIndex(id: string) {
    // FNV-1a: ids that differ only in their last characters (as cuids do)
    // still spread across the palette.
    let hash = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        hash ^= id.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash % PROJECT_HEX.length;
}

/** Stable color class for a project's dot, derived from its id. */
export function projectDot(id: string) {
    return PROJECT_DOTS[paletteIndex(id)];
}

/** The same color as a hex value, for gradients and inline styles. */
export function projectHex(id: string) {
    return PROJECT_HEX[paletteIndex(id)];
}
