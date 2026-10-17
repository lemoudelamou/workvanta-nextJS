/** The colours a label can have. Stored by key; classes live here. */
export const LABEL_COLORS = [
    { key: "gray", name: "Gray", dot: "bg-slate-400", chip: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300" },
    { key: "red", name: "Red", dot: "bg-red-500", chip: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300" },
    { key: "orange", name: "Orange", dot: "bg-orange-500", chip: "bg-orange-500/10 text-orange-700 ring-orange-500/20 dark:text-orange-300" },
    { key: "amber", name: "Yellow", dot: "bg-amber-500", chip: "bg-amber-500/12 text-amber-800 ring-amber-500/25 dark:text-amber-300" },
    { key: "green", name: "Green", dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300" },
    { key: "teal", name: "Teal", dot: "bg-teal-500", chip: "bg-teal-500/10 text-teal-700 ring-teal-500/20 dark:text-teal-300" },
    { key: "blue", name: "Blue", dot: "bg-blue-500", chip: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300" },
    { key: "violet", name: "Purple", dot: "bg-violet-500", chip: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300" },
    { key: "pink", name: "Pink", dot: "bg-pink-500", chip: "bg-pink-500/10 text-pink-700 ring-pink-500/20 dark:text-pink-300" },
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number]["key"];

export type TaskLabelView = { id: string; name: string; color: string };

export const LABEL_NAME_MAX = 30;

export function isLabelColor(value: unknown): value is LabelColor {
    return typeof value === "string" && LABEL_COLORS.some((c) => c.key === value);
}

export function labelColor(key: string) {
    return LABEL_COLORS.find((c) => c.key === key) ?? LABEL_COLORS[0];
}

/** A new label gets the first colour the project isn't using yet. */
export function nextLabelColor(used: string[]): LabelColor {
    const free = LABEL_COLORS.filter((c) => c.key !== "gray" && !used.includes(c.key));
    return (free[0] ?? LABEL_COLORS[(used.length % (LABEL_COLORS.length - 1)) + 1]).key;
}

export function normalizeLabelName(name: string) {
    return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Ready-made labels every project can pick from. One is created in the project the first time it's used. */
export const PRESET_LABELS: { name: string; color: LabelColor }[] = [
    { name: "Bug", color: "red" },
    { name: "Feature", color: "blue" },
    { name: "Improvement", color: "violet" },
    { name: "Urgent", color: "orange" },
    { name: "Design", color: "pink" },
    { name: "Documentation", color: "teal" },
    { name: "Research", color: "amber" },
    { name: "Testing", color: "green" },
    { name: "Chore", color: "gray" },
];

export function presetLabel(name: string) {
    const normalized = normalizeLabelName(name);
    return PRESET_LABELS.find((p) => normalizeLabelName(p.name) === normalized);
}

/** Labels in a stable order: by name. */
export function sortLabels<T extends { name: string }>(labels: T[]) {
    return [...labels].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}
