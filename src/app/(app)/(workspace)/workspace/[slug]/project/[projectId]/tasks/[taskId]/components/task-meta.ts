/** Shared labels, colours and helpers for the task page. Plain module: safe on server and client. */

export const STATUS_OPTIONS = [
    { value: "TODO", label: "To do", dot: "bg-status-todo" },
    { value: "IN_PROGRESS", label: "In progress", dot: "bg-status-progress" },
    { value: "IN_REVIEW", label: "In review", dot: "bg-status-review" },
    { value: "DONE", label: "Done", dot: "bg-status-done" },
] as const;

// Same colours as the board's priority chips.
export const PRIORITY_OPTIONS = [
    { value: "URGENT", label: "Urgent", dot: "bg-danger", bars: 4 },
    { value: "HIGH", label: "High", dot: "bg-orange-500", bars: 3 },
    { value: "MEDIUM", label: "Medium", dot: "bg-amber-500", bars: 2 },
    { value: "LOW", label: "Low", dot: "bg-sky-500", bars: 1 },
] as const;

const NEUTRAL = "bg-muted-foreground/60";

function humanise(value: string) {
    const text = value.replaceAll("_", " ").toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function statusMeta(value: string) {
    return STATUS_OPTIONS.find((o) => o.value === value) ?? { value, label: humanise(value), dot: NEUTRAL };
}

export function priorityMeta(value: string) {
    return PRIORITY_OPTIONS.find((o) => o.value === value) ?? { value, label: humanise(value), dot: NEUTRAL, bars: 0 };
}

/** Everything the update action needs; changing one field re-sends the rest. */
export type TaskValues = {
    title: string;
    description: string;
    status: string;
    priority: string;
    assigneeId: string;
    /** yyyy-mm-dd or "" */
    dueDate: string;
};

export type UpdateTask = (formData: FormData) => void | Promise<void>;

export function taskFormData(values: TaskValues) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) formData.set(key, value);
    return formData;
}

/** A Next redirect thrown by a server action is navigation, not a failure. */
export function isRedirect(error: unknown) {
    const digest = (error as { digest?: unknown } | null)?.digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export function getInitials(name: string | null, email: string) {
    const text = name?.trim() || email;
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return text.slice(0, 2).toUpperCase();
}

const NUMBER = new Intl.NumberFormat("en-US");

/** Fixed locale so server and browser render the same digits. */
export function formatNumber(value: number) {
    return NUMBER.format(value);
}

export function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
