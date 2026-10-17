import {
    Activity as ActivityGlyph,
    ArrowRight,
    CalendarDays,
    Flag,
    Link2,
    Link2Off,
    Repeat,
    MessageSquareX,
    Paperclip,
    Plus,
    Trash2,
    User,
    type LucideIcon,
} from "lucide-react";

export type ActivityEntry = {
    id: string;
    action: string;
    metadata: unknown;
    createdAt: Date;
    user: { id: string; name: string | null; email: string; image: string | null };
};

type ActivityMetadata = {
    from?: string | null;
    to?: string | null;
    filename?: string | null;
};

/** Comment events are left out of the stream: the comment itself is there. */
export const HIDDEN_IN_FEED = new Set(["COMMENT_CREATED", "COMMENT_UPDATED"]);

const ICONS: Record<string, { icon: LucideIcon; danger?: boolean }> = {
    TASK_CREATED: { icon: Plus },
    TASK_STATUS_CHANGED: { icon: ArrowRight },
    TASK_PRIORITY_CHANGED: { icon: Flag },
    TASK_ASSIGNED: { icon: User },
    COMMENT_DELETED: { icon: MessageSquareX },
    ATTACHMENT_UPLOADED: { icon: Paperclip },
    ATTACHMENT_DELETED: { icon: Paperclip },
    TASK_DELETED: { icon: Trash2, danger: true },
    TASK_DUE_DATE_CHANGED: { icon: CalendarDays },
    TASK_RECURRENCE_CHANGED: { icon: Repeat },
    TASK_REPEATED: { icon: Repeat },
    DEPENDENCY_ADDED: { icon: Link2 },
    DEPENDENCY_REMOVED: { icon: Link2Off },
};

const SHORT_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Oct 24" for a stored due date (saved as the end of that day). */
function dayLabel(iso?: string | null) {
    const date = iso ? new Date(iso) : null;
    return date && !Number.isNaN(date.getTime()) ? SHORT_DAY.format(date) : null;
}

export function activityIcon(action: string) {
    return ICONS[action] ?? { icon: ActivityGlyph };
}

export function formatValue(value?: string | null) {
    if (!value) return "none";
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function activityMetadata(metadata: unknown): ActivityMetadata {
    return metadata && typeof metadata === "object" ? (metadata as ActivityMetadata) : {};
}

export function getActivityText({ action, metadata }: Pick<ActivityEntry, "action" | "metadata">) {
    const meta = activityMetadata(metadata);

    switch (action) {
        case "TASK_CREATED":
            return "created this task";
        case "TASK_STATUS_CHANGED":
            return `changed status from ${formatValue(meta.from)} to ${formatValue(meta.to)}`;
        case "TASK_PRIORITY_CHANGED":
            return `changed priority from ${formatValue(meta.from)} to ${formatValue(meta.to)}`;
        case "TASK_ASSIGNED":
            return meta.to ? "assigned the task" : "removed the task assignee";
        case "COMMENT_CREATED":
            return "added a comment";
        case "COMMENT_UPDATED":
            return "updated a comment";
        case "COMMENT_DELETED":
            return "deleted a comment";
        case "ATTACHMENT_UPLOADED":
            return meta.filename ? `attached ${meta.filename}` : "attached a file";
        case "ATTACHMENT_DELETED":
            return meta.filename ? `removed ${meta.filename}` : "removed an attachment";
        case "TASK_DELETED":
            return "deleted this task";
        case "TASK_DUE_DATE_CHANGED": {
            const to = dayLabel(meta.to);
            return to ? `moved the due date to ${to}` : "removed the due date";
        }
        case "TASK_RECURRENCE_CHANGED":
            return meta.to ? `set this task to repeat ${meta.to}` : "stopped this task repeating";
        case "TASK_REPEATED": {
            const to = dayLabel(meta.to);
            return to ? `finished the last one, so this repeat is due ${to}` : "finished the last one, so this repeat was created";
        }
        case "DEPENDENCY_ADDED":
            return meta.to ? `marked this as blocked by “${meta.to}”` : "added a blocker";
        case "DEPENDENCY_REMOVED":
            return meta.from ? `removed “${meta.from}” as a blocker` : "removed a blocker";
        default:
            return action.replaceAll("_", " ").toLowerCase();
    }
}
