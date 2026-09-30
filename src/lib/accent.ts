import type { CSSProperties } from "react";

export const ACCENTS = {
    indigo: ["99 102 241", "236 72 153"],
    emerald: ["16 185 129", "56 189 248"],
    amber: ["245 158 11", "244 63 94"],
    violet: ["139 92 246", "56 189 248"],
    rose: ["244 63 94", "251 146 60"],
} as const;

export type CardAccent = keyof typeof ACCENTS;

const ACCENT_ORDER = Object.keys(ACCENTS) as CardAccent[];

export function accentFor(key: string): CardAccent {
    let hash = 0;
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return ACCENT_ORDER[hash % ACCENT_ORDER.length];
}

export function accentVars(accent: CardAccent): CSSProperties {
    const [c1, c2] = ACCENTS[accent];
    return { "--accent": c1, "--accent-2": c2 } as CSSProperties;
}