import Link from "next/link";
import {
    Activity as ActivityGlyph,
    ArrowRight,
    Flag,
    History,
    MessageSquare,
    Paperclip,
    Plus,
    Trash2,
    User,
    type LucideIcon,
} from "lucide-react";

type Activity = {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: unknown;
    createdAt: Date;
    user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
    };
};

type ActivitySectionProps = {
    activities: Activity[];
    /** Total entries on the task; more than shown adds a "show all" link. */
    totalCount?: number;
    showAllHref?: string;
};

type ActivityMetadata = {
    from?: string | null;
    to?: string | null;
    filename?: string | null;
};


const dateFormatter = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
});

const ACTIVITY_STYLES: Record<string, { icon: LucideIcon; danger?: boolean }> = {
    TASK_CREATED: { icon: Plus },
    TASK_STATUS_CHANGED: { icon: ArrowRight },
    TASK_PRIORITY_CHANGED: { icon: Flag },
    TASK_ASSIGNED: { icon: User },
    COMMENT_CREATED: { icon: MessageSquare },
    COMMENT_UPDATED: { icon: MessageSquare },
    COMMENT_DELETED: { icon: MessageSquare },
    ATTACHMENT_UPLOADED: { icon: Paperclip },
    ATTACHMENT_DELETED: { icon: Paperclip },
    TASK_DELETED: { icon: Trash2, danger: true },
};

function getUserName(user: Activity["user"]) {
    return user.name?.trim() || user.email;
}

function formatValue(value?: string | null) {
    if (!value) return "none";

    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActivityText({ action, metadata }: Activity) {
    const meta: ActivityMetadata =
        metadata && typeof metadata === "object" ? (metadata as ActivityMetadata) : {};

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

        default:
            return action.replaceAll("_", " ").toLowerCase();
    }
}

export function ActivitySection({
    activities,
    totalCount = activities.length,
    showAllHref,
}: ActivitySectionProps) {
    const hiddenCount = Math.max(0, totalCount - activities.length);

    return (
        <section className="relative overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]">
            <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
                <History className="size-4 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Activity</h2>
            </div>

            {activities.length === 0 ? (
                <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground sm:px-5">
                    No activity yet. Changes to this task will appear here.
                </p>
            ) : (
                <ol className="border-t border-border px-4 py-3 sm:px-5">
                    {activities.map((activity, index) => {
                        const { icon: Icon, danger } = ACTIVITY_STYLES[activity.action] ?? { icon: ActivityGlyph };
                        const last = index === activities.length - 1;

                        return (
                            <li key={activity.id} className="relative flex gap-3 pb-3 last:pb-0">
                                {!last && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute bottom-0 left-3 top-7 w-px -translate-x-1/2 bg-border"
                                    />
                                )}
                                <span
                                    aria-hidden="true"
                                    className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border ${
                                        danger
                                            ? "border-danger/25 bg-danger/10 text-danger"
                                            : "border-border bg-card text-muted-foreground"
                                    }`}
                                >
                                    <Icon className="size-3" />
                                </span>

                                <div className="flex min-w-0 flex-1 flex-col gap-x-3 pt-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                                    <p className="min-w-0 text-sm leading-5">
                                        <span className="font-medium text-foreground">{getUserName(activity.user)}</span>{" "}
                                        <span className="text-muted-foreground">{getActivityText(activity)}</span>
                                    </p>
                                    <time
                                        dateTime={new Date(activity.createdAt).toISOString()}
                                        className="shrink-0 text-xs text-muted-foreground"
                                    >
                                        {dateFormatter.format(new Date(activity.createdAt))}
                                    </time>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            {hiddenCount > 0 && showAllHref && (
                <div className="border-t border-border px-4 py-2.5 text-center sm:px-5">
                    <Link
                        href={showAllHref}
                        scroll={false}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                        Show {hiddenCount} older {hiddenCount === 1 ? "change" : "changes"}
                    </Link>
                </div>
            )}
        </section>
    );
}