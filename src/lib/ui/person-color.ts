// Soft tint + strong ink per person, so initials avatars are told apart at a
// glance (the board, comments, member lists). Every class is spelled out so
// Tailwind can see it; dark mode uses a translucent tint of the same hue.
const PERSON_COLORS = [
    "bg-[#e8e6ff] text-[#4338ca] dark:bg-[#6d5efc]/25 dark:text-[#c7c2ff]",
    "bg-[#dff4f7] text-[#0e7490] dark:bg-[#0891b2]/25 dark:text-[#a5e6f1]",
    "bg-[#ffeadb] text-[#c2410c] dark:bg-[#ea580c]/25 dark:text-[#ffc9a3]",
    "bg-[#fde4ef] text-[#be185d] dark:bg-[#db2777]/25 dark:text-[#f9b8d4]",
    "bg-[#e0f4e6] text-[#15803d] dark:bg-[#16a34a]/25 dark:text-[#a7e3b9]",
    "bg-[#f1e6fd] text-[#7e22ce] dark:bg-[#9333ea]/25 dark:text-[#dcc0fb]",
    "bg-[#e1ecfd] text-[#1d4ed8] dark:bg-[#2563eb]/25 dark:text-[#b5cdfb]",
    "bg-[#fbf0d4] text-[#a16207] dark:bg-[#ca8a04]/25 dark:text-[#f3d58a]",
] as const;

/** Stable color classes for a person, keyed by email (or id). */
export function personColor(key: string | null | undefined) {
    const value = (key ?? "").trim().toLowerCase();
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return PERSON_COLORS[hash % PERSON_COLORS.length];
}
