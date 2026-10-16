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
import { hairline, glass, starlightEdge, iconTile, dangerTile } from "@/app/style/ui-tokens";

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
        <section
            className={`${glass} ${hairline} ${starlightEdge} relative overflow-hidden rounded-2xl`}
        >
            <div className="relative flex items-center justify-between gap-4 border-b border-slate-200/70 px-5 py-4 sm:px-6 dark:border-white/[0.06]">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">
                        Activity
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        History of changes made to this task.
                    </p>
                </div>

                <span className={`${iconTile} size-9 rounded-xl`}>
          <History className="size-4" />
        </span>
            </div>

            {activities.length === 0 ? (
                <div className="px-6 py-10 text-center">
          <span className={`${iconTile} mx-auto size-11 rounded-2xl border-dashed`}>
            <History className="size-5" />
          </span>

                    <p className="mt-4 text-sm font-medium text-slate-950 dark:text-white">
                        No activity yet.
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Changes to this task will appear here.
                    </p>
                </div>
            ) : (
                <div className="relative">
                    {activities.map((activity, index) => {
                        const { icon: Icon, danger } =
                        ACTIVITY_STYLES[activity.action] ?? { icon: ActivityGlyph };

                        return (
                            <div
                                key={activity.id}
                                className="relative flex gap-4 px-5 py-5 transition-colors hover:bg-slate-500/[0.04] sm:px-6"
                            >
                                {index < activities.length - 1 && (
                                    <div className="absolute -bottom-4 left-[2.375rem] top-[3.75rem] w-px -translate-x-1/2 bg-slate-200 sm:left-[2.625rem] dark:bg-white/[0.08]" />
                                )}

                                <div
                                    className={`${danger ? dangerTile : iconTile} relative z-10 size-9 rounded-xl`}
                                >
                                    <Icon className="size-4" />
                                </div>

                                <div className="min-w-0 flex-1 pt-0.5">
                                    <p className="text-sm leading-5">
                    <span className="font-semibold text-slate-950 dark:text-white">
                      {getUserName(activity.user)}
                    </span>{" "}
                                        <span className="text-slate-500 dark:text-slate-400">
                      {getActivityText(activity)}
                    </span>
                                    </p>

                                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                                        {dateFormatter.format(new Date(activity.createdAt))}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {hiddenCount > 0 && showAllHref && (
                <div className="border-t border-slate-200/70 px-5 py-3 text-center sm:px-6 dark:border-white/[0.06]">
                    <Link
                        href={showAllHref}
                        scroll={false}
                        className="text-sm font-medium text-slate-600 hover:text-slate-950 hover:underline dark:text-slate-300 dark:hover:text-white"
                    >
                        Show {hiddenCount} older {hiddenCount === 1 ? "change" : "changes"}
                    </Link>
                </div>
            )}
        </section>
    );
}