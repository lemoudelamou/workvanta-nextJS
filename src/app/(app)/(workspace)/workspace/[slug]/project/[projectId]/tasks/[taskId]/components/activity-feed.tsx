"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { Check, Loader2, Pencil, Trash2 } from "lucide-react";

import ConfirmationModal from "@/components/ui/Modal";
import { activityIcon, activityMetadata, formatValue, getActivityText } from "./activity-text";
import { LocalTime } from "./local-time";
import { errorMessage, formatNumber, statusMeta } from "./task-meta";
import { PersonAvatar } from "./task-properties";

type Author = { id: string; name: string | null; email: string; image: string | null };

export type FeedComment = {
    kind: "comment";
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: Author;
};

export type FeedEvent = {
    kind: "event";
    id: string;
    action: string;
    metadata: unknown;
    createdAt: Date;
    user: Author;
};

export type FeedItem = FeedComment | FeedEvent;

type DeleteComment = (commentId: string) => void | Promise<void>;
type UpdateComment = (commentId: string, formData: FormData) => void | Promise<void>;

type Filter = "all" | "comments" | "history";

const MAX_LENGTH = 5000;
const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

const displayName = (person: Author) => person.name?.trim() || person.email;

function wasEdited(comment: FeedComment) {
    return new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();
}

function renderCommentContent(content: string, members: Author[]) {
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    for (const match of content.matchAll(MENTION_PATTERN)) {
        const [fullMatch, name, email] = match;
        const start = match.index;
        if (start === undefined) continue;

        if (start > lastIndex) parts.push(<span key={`text-${start}`}>{content.slice(lastIndex, start)}</span>);

        const member = members.find((m) => m.email.toLowerCase() === email.toLowerCase());
        parts.push(
            <span key={`mention-${start}`} className="rounded-md bg-brand-soft px-1 py-0.5 font-medium text-brand dark:bg-brand/15">
                @{member?.name ?? name}
            </span>,
        );
        lastIndex = start + fullMatch.length;
    }

    if (lastIndex < content.length) parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>);
    return parts;
}

const iconButton =
    "flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50";

/**
 * Asks before deleting a comment, in the app's own dialog rather than the
 * browser's. Shared by authors deleting their own comment and moderators.
 */
function useDeleteConfirmation(commentId: string, deleteComment: DeleteComment, failure: string) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function confirm() {
        setError(null);
        startTransition(async () => {
            try {
                await deleteComment(commentId);
                setOpen(false);
            } catch (err) {
                setError(errorMessage(err, failure));
            }
        });
    }

    return {
        isPending,
        ask: () => {
            setError(null);
            setOpen(true);
        },
        modalProps: {
            open,
            error,
            loading: isPending,
            onConfirm: confirm,
            onClose: () => setOpen(false),
        },
    };
}

function CommentCard({
    comment,
    members,
    isOwn,
    canModerate,
    updateComment,
    deleteComment,
}: {
    comment: FeedComment;
    members: Author[];
    isOwn: boolean;
    canModerate: boolean;
    updateComment: UpdateComment;
    deleteComment: DeleteComment;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comment.content);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startTransition] = useTransition();

    const deletion = useDeleteConfirmation(
        comment.id,
        deleteComment,
        isOwn ? "Couldn't delete the comment. Please try again." : "Couldn't remove the comment. Please try again.",
    );

    function save() {
        const content = draft.trim();
        if (!content) return;
        setError(null);
        const formData = new FormData();
        formData.set("content", content);
        startTransition(async () => {
            try {
                await updateComment(comment.id, formData);
                setEditing(false);
            } catch (err) {
                setError(errorMessage(err, "Couldn't save the comment. Please try again."));
            }
        });
    }

    const canDelete = isOwn || canModerate;

    return (
        <div className="group/comment min-w-0 flex-1 rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]">
            <div className="flex items-center gap-2 py-1.5 pl-3.5 pr-1.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                    <span className="truncate text-[13px] font-semibold text-foreground">
                        {displayName(comment.author)}
                        {isOwn && <span className="font-normal text-muted-foreground"> (you)</span>}
                    </span>
                    <LocalTime date={comment.createdAt} className="text-xs text-muted-foreground" />
                    {wasEdited(comment) && <span className="text-xs text-muted-foreground">edited</span>}
                </div>

                {!editing && (isOwn || canDelete) && (
                    <div className="flex shrink-0 items-center opacity-100 transition-opacity group-focus-within/comment:opacity-100 group-hover/comment:opacity-100 [@media(hover:hover)]:opacity-0">
                        {isOwn && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDraft(comment.content);
                                    setError(null);
                                    setEditing(true);
                                }}
                                aria-label="Edit comment"
                                title="Edit"
                                className={`${iconButton} hover:bg-muted hover:text-foreground`}
                            >
                                <Pencil className="size-3.5" aria-hidden="true" />
                            </button>
                        )}
                        {canDelete && (
                            <button
                                type="button"
                                onClick={deletion.ask}
                                disabled={deletion.isPending}
                                aria-label={isOwn ? "Delete comment" : "Remove comment"}
                                title={isOwn ? "Delete" : "Remove"}
                                className={`${iconButton} hover:bg-danger/10 hover:text-danger`}
                            >
                                {deletion.isPending ? (
                                    <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                                ) : (
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="px-3.5 pb-3">
                {editing ? (
                    <>
                        <label htmlFor={`edit-${comment.id}`} className="sr-only">
                            Edit comment
                        </label>
                        <textarea
                            id={`edit-${comment.id}`}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") setEditing(false);
                                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
                            }}
                            maxLength={MAX_LENGTH}
                            rows={3}
                            disabled={isSaving}
                            autoFocus
                            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={save}
                                disabled={isSaving || !draft.trim()}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-50 dark:text-[#0f1115]"
                            >
                                {isSaving ? (
                                    <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                                ) : (
                                    <Check className="size-3.5" aria-hidden="true" />
                                )}
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                disabled={isSaving}
                                className="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                                {formatNumber(draft.length)} / {formatNumber(MAX_LENGTH)}
                            </span>
                        </div>
                    </>
                ) : (
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                        {renderCommentContent(comment.content, members)}
                    </p>
                )}
                {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
            </div>

            {canDelete && (
                <ConfirmationModal
                    {...deletion.modalProps}
                    title={isOwn ? "Delete comment?" : "Remove comment?"}
                    description={
                        isOwn
                            ? "Your comment will be removed for everyone. This can't be undone."
                            : `${displayName(comment.author)}'s comment will be removed for everyone. This can't be undone.`
                    }
                    confirmLabel={isOwn ? "Delete" : "Remove"}
                    loadingLabel={isOwn ? "Deleting..." : "Removing..."}
                />
            )}
        </div>
    );
}

function StatusChip({ value }: { value?: string | null }) {
    const meta = statusMeta(value ?? "");
    return (
        <span className="mx-0.5 inline-flex items-center gap-1.5 font-medium text-foreground">
            <span aria-hidden="true" className={`size-2 rounded-full ${meta.dot}`} />
            {value ? meta.label : "none"}
        </span>
    );
}

function EventText({ event }: { event: FeedEvent }) {
    const meta = activityMetadata(event.metadata);
    if (event.action === "TASK_STATUS_CHANGED") {
        return (
            <>
                moved this from <StatusChip value={meta.from} /> to <StatusChip value={meta.to} />
            </>
        );
    }
    if (event.action === "TASK_PRIORITY_CHANGED") {
        return (
            <>
                set priority to <span className="font-medium text-foreground">{formatValue(meta.to)}</span>
            </>
        );
    }
    return <>{getActivityText(event)}</>;
}

function EventRow({ event }: { event: FeedEvent }) {
    const { icon: Icon, danger } = activityIcon(event.action);
    return (
        <>
            <span
                aria-hidden="true"
                className={`relative z-10 mx-1 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-4 ring-canvas ${
                    danger ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground"
                }`}
            >
                <Icon className="size-3" />
            </span>
            <p className="min-w-0 flex-1 text-[13px] leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">{displayName(event.user)}</span> <EventText event={event} />
                <span className="ml-2 whitespace-nowrap text-xs">
                    <LocalTime date={event.createdAt} />
                </span>
            </p>
        </>
    );
}

const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "comments", label: "Comments" },
    { value: "history", label: "History" },
];

/**
 * One stream for the conversation and the task's history, oldest first,
 * with the comment box at the end.
 */
export function ActivityFeed({
    items,
    commentCount,
    composer,
    currentUser,
    currentUserId,
    members,
    deleteComment,
    updateComment,
    canModerate = false,
    showEarlierHref,
}: {
    items: FeedItem[];
    /** All comments on the task, including any not loaded. */
    commentCount: number;
    composer: ReactNode;
    currentUser?: Author | null;
    currentUserId: string;
    members: Author[];
    deleteComment: DeleteComment;
    updateComment: UpdateComment;
    canModerate?: boolean;
    /** Set when older comments or history weren't loaded. */
    showEarlierHref?: string | null;
}) {
    const [filter, setFilter] = useState<Filter>("all");

    const visible = items.filter(
        (item) => filter === "all" || (filter === "comments" ? item.kind === "comment" : item.kind === "event"),
    );

    return (
        <section aria-labelledby="activity-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="activity-heading" className="flex items-baseline gap-2 text-[15px] font-semibold text-foreground">
                    Activity
                    <span className="text-[13px] font-normal text-muted-foreground">
                        {commentCount} {commentCount === 1 ? "comment" : "comments"}
                    </span>
                </h2>

                <div role="group" aria-label="Show" className="flex rounded-lg bg-foreground/[0.05] p-0.5">
                    {FILTERS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={filter === option.value}
                            onClick={() => setFilter(option.value)}
                            className={`h-7 rounded-md px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                                filter === option.value
                                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(23,26,33,0.08)] dark:bg-white/10"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {showEarlierHref && (
                <Link
                    href={showEarlierHref}
                    scroll={false}
                    className="mt-4 inline-flex text-[13px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                    Show earlier activity
                </Link>
            )}

            <ol className="relative mt-4 space-y-4">
                {/* The rail that threads the stream together. */}
                {visible.length > 1 && (
                    <span aria-hidden="true" className="absolute bottom-3 left-[13px] top-3 w-px bg-border" />
                )}

                {visible.length === 0 && (
                    <li className="py-2 text-sm text-muted-foreground">
                        {filter === "history" ? "No changes yet." : "No comments yet. Start the conversation below."}
                    </li>
                )}

                {visible.map((item) =>
                    item.kind === "comment" ? (
                        <li key={`c-${item.id}`} className="relative flex gap-3">
                            <span className="relative z-10 rounded-full ring-4 ring-canvas">
                                <PersonAvatar person={item.author} size={28} />
                            </span>
                            <CommentCard
                                comment={item}
                                members={members}
                                isOwn={item.author.id === currentUserId}
                                canModerate={canModerate}
                                updateComment={updateComment}
                                deleteComment={deleteComment}
                            />
                        </li>
                    ) : (
                        <li key={`e-${item.id}`} className="relative flex gap-3">
                            <EventRow event={item} />
                        </li>
                    ),
                )}
            </ol>

            {/* Above what follows so the @mention list can overlap it. */}
            <div className="relative z-30 mt-5 flex gap-3">
                {currentUser && (
                    <span className="hidden pt-1 sm:block">
                        <PersonAvatar person={currentUser} size={28} />
                    </span>
                )}
                <div className="min-w-0 flex-1">{composer}</div>
            </div>
        </section>
    );
}
