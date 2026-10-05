import { type CardAccent } from "@/components/ui/Card";

const ACCENT_ORDER: CardAccent[] = [
    "indigo",
    "emerald",
    "amber",
    "violet",
    "rose",
];

export function accentFor(slug: string): CardAccent {
    let hash = 0;

    for (const ch of slug) {
        hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    }

    return ACCENT_ORDER[hash % ACCENT_ORDER.length];
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(date: Date): string {
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ["year", 60 * 60 * 24 * 365],
        ["month", 60 * 60 * 24 * 30],
        ["week", 60 * 60 * 24 * 7],
        ["day", 60 * 60 * 24],
        ["hour", 60 * 60],
        ["minute", 60],
    ];
    for (const [unit, size] of steps) {
        if (Math.abs(seconds) >= size) {
            return RELATIVE.format(Math.round(seconds / size), unit);
        }
    }
    return "just now";
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function initials(name: string) {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "W"
    );
}