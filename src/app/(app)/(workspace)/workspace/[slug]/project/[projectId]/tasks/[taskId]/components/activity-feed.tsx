"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Loader2, MessagesSquare, Pencil, Trash2 } from "lucide-react";

import ConfirmationModal from "@/components/ui/Modal";
import { activityIcon, activityMetadata, formatValue, getActivityText } from "./activity-text";
import { dayKey, formatDayLabel, formatTime, useHydrated } from "./local-time";
import { MentionEditor, type MentionMember } from "./mention-editor";
import { errorMessage, statusMeta } from "./task-meta";
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
/** Messages from the same person this close together share one header. */
const GROUP_WINDOW_MS = 5 * 60_000;

const displayName = (person: Author) => person.name?.trim() || person.email;

function wasEdited(comment: FeedComment) {
    return new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();
}

/** Comment text with mentions shown as the person's name in bold. */
export function renderCommentContent(content: string, members: MentionMember[]) {
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    for (const match of content.matchAll(MENTION_PATTERN)) {
        const [fullMatch, name, email] = match;
        const start = match.index;
        if (start === undefined) continue;

        if (start > lastIndex) parts.push(content.slice(lastIndex, start));
        const member = members.find((m) => m.email.toLowerCase() === email.toLowerCase());
        parts.push(
            <strong key={`mention-${start}`} className="font-semibold">
                {member?.name ?? name}
            </strong>,
        );
        lastIndex = start + fullMatch.length;
    }

    if (lastIndex < content.length) parts.push(content.slice(lastIndex));
    return parts;
}

const iconButton =
    "flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50";

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
        modalProps: { open, error, loading: isPending, onConfirm: confirm, onClose: () => setOpen(false) },
    };
}

function CommentMessage({
    comment,
    members,
    isOwn,
    canModerate,
    showHeader,
    updateComment,
    deleteComment,
}: {
    comment: FeedComment;
    members: MentionMember[];
    isOwn: boolean;
    canModerate: boolean;
    showHeader: boolean;
    updateComment: UpdateComment;
    deleteComment: DeleteComment;
}) {
    const hydrated = useHydrated();
    const editorRef = useRef<HTMLDivElement>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comment.content);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startTransition] = useTransition();

    const deletion = useDeleteConfirmation(
        comment.id,
        deleteComment,
        isOwn ? "Couldn't delete the comment. Please try again." : "Couldn't remove the comment. Please try again.",
    );
    const canDelete = isOwn || canModerate;

    function save() {
        const content = draft.trim();
        if (!content || content.length > MAX_LENGTH) return;
        if (content === comment.content) return setEditing(false);
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

    const time = formatTime(new Date(comment.createdAt), hydrated);

    const actions = !editing && canDelete && (
        <div className="flex shrink-0 items-center self-center opacity-100 transition-opacity group-focus-within/msg:opacity-100 group-hover/msg:opacity-100 [@media(hover:hover)]:opacity-0">
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
        </div>
    );

    return (
        <div className={`group/msg flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""} ${showHeader ? "mt-4" : "mt-1"}`}>
            {!isOwn && (
                <div className="w-8 shrink-0">
                    {showHeader && <PersonAvatar person={comment.author} size={32} />}
                </div>
            )}

            <div className={`flex min-w-0 max-w-[85%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
                {showHeader && (
                    <p className="mb-1 flex items-baseline gap-2 px-1 text-xs text-muted-foreground">
                        {!isOwn && <span className="font-semibold text-foreground">{displayName(comment.author)}</span>}
                        <time dateTime={new Date(comment.createdAt).toISOString()}>{time}</time>
                    </p>
                )}

                <div className={`flex max-w-full items-start gap-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                    {editing ? (
                        <div className="w-[min(28rem,70vw)] rounded-2xl border border-brand bg-background px-3.5 py-2.5 ring-4 ring-brand/15">
                            <MentionEditor
                                editorRef={editorRef}
                                members={members}
                                initialValue={comment.content}
                                label="Edit comment"
                                placeholder="Edit your comment"
                                autoFocus
                                disabled={isSaving}
                                onChange={setDraft}
                                onSubmit={save}
                                onCancel={() => setEditing(false)}
                                className="text-sm leading-6 text-foreground"
                            />
                            <div className="mt-2 flex items-center justify-end gap-1.5">
                                <span className="mr-auto text-[11px] text-muted-foreground">Enter to save, Esc to cancel</span>
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    disabled={isSaving}
                                    className="h-7 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={isSaving || !draft.trim()}
                                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-strong disabled:opacity-50 dark:text-[#0f1115]"
                                >
                                    {isSaving && <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />}
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`min-w-0 rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                                isOwn
                                    ? "rounded-tr-md bg-brand text-white dark:bg-brand/90 dark:text-[#0f1115]"
                                    : "rounded-tl-md bg-muted text-foreground dark:bg-white/[0.07]"
                            }`}
                        >
                            <p className="whitespace-pre-wrap break-words">{renderCommentContent(comment.content, members)}</p>
                            {wasEdited(comment) && (
                                <span className={`text-[11px] ${isOwn ? "text-white/70 dark:text-[#0f1115]/60" : "text-muted-foreground"}`}>
                                    (edited)
                                </span>
                            )}
                        </div>
                    )}
                    {actions}
                </div>
                {error && <p className="mt-1 px-1 text-xs font-medium text-danger">{error}</p>}
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

function StatusName({ value }: { value?: string | null }) {
    const meta = statusMeta(value ?? "");
    return (
        <span className="mx-0.5 inline-flex items-center gap-1 font-medium text-foreground">
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
                moved this from <StatusName value={meta.from} /> to <StatusName value={meta.to} />
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

function EventLine({ event }: { event: FeedEvent }) {
    const hydrated = useHydrated();
    const { icon: Icon, danger } = activityIcon(event.action);
    return (
        <div className="mt-3 flex items-start gap-2.5 px-1 text-xs leading-5 text-muted-foreground">
            <span
                aria-hidden="true"
                className={`mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full ${
                    danger ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground dark:bg-white/[0.07]"
                }`}
            >
                <Icon className="size-2.5" />
            </span>
            <p className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{displayName(event.user)}</span> <EventText event={event} />
            </p>
            <time dateTime={new Date(event.createdAt).toISOString()} className="shrink-0 tabular-nums">
                {formatTime(new Date(event.createdAt), hydrated)}
            </time>
        </div>
    );
}

const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "comments", label: "Comments" },
    { value: "history", label: "History" },
];

/**
 * The conversation and the task's history in one chat-style panel: oldest
 * at the top, newest just above the comment box.
 */
export function ActivityFeed({
    items,
    commentCount,
    composer,
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
    currentUserId: string;
    members: Author[];
    deleteComment: DeleteComment;
    updateComment: UpdateComment;
    canModerate?: boolean;
    /** Set when older comments or history weren't loaded. */
    showEarlierHref?: string | null;
}) {
    const hydrated = useHydrated();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [filter, setFilter] = useState<Filter>("all");

    const visible = items.filter(
        (item) => filter === "all" || (filter === "comments" ? item.kind === "comment" : item.kind === "event"),
    );

    // Start at the newest message, and follow new ones as they arrive.
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [visible.length, filter]);

    // Day separators, and one header per run of messages from the same person.
    const rows: { item: FeedItem; dayLabel: string | null; showHeader: boolean }[] = [];
    for (let i = 0; i < visible.length; i++) {
        const item = visible[i];
        const before = visible[i - 1];
        const created = new Date(item.createdAt);
        const newDay = !before || dayKey(new Date(before.createdAt), hydrated) !== dayKey(created, hydrated);
        const continues =
            !newDay &&
            before?.kind === "comment" &&
            item.kind === "comment" &&
            before.author.id === item.author.id &&
            created.getTime() - new Date(before.createdAt).getTime() < GROUP_WINDOW_MS;
        rows.push({ item, dayLabel: newDay ? formatDayLabel(created, hydrated) : null, showHeader: !continues });
    }

    return (
        <section
            aria-labelledby="activity-heading"
            className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04),0_8px_24px_-16px_rgba(23,26,33,0.12)] xl:sticky xl:top-4 xl:h-[calc(100dvh-2.5rem)] xl:max-h-[56rem]"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                <h2 id="activity-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    Activity
                    {commentCount > 0 && (
                        <span className="rounded-full bg-muted px-2 text-[11px] font-medium leading-5 tabular-nums text-muted-foreground">
                            {commentCount} {commentCount === 1 ? "comment" : "comments"}
                        </span>
                    )}
                </h2>

                <div role="group" aria-label="Show" className="flex rounded-full bg-foreground/[0.05] p-0.5">
                    {FILTERS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={filter === option.value}
                            onClick={() => setFilter(option.value)}
                            className={`h-7 rounded-full px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${
                                filter === option.value
                                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(23,26,33,0.1)] dark:bg-white/10"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 px-4 pb-4 sm:px-5 xl:overflow-y-auto">
                {showEarlierHref && (
                    <div className="pt-4 text-center">
                        <Link
                            href={showEarlierHref}
                            scroll={false}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Show earlier activity
                        </Link>
                    </div>
                )}

                {visible.length === 0 ? (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 py-10 text-center">
                        <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-brand/15">
                            <MessagesSquare className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {filter === "history" ? "No changes yet" : "No comments yet"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {filter === "history"
                                    ? "Changes to this task will show up here."
                                    : "Ask a question or share an update below."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <ol className="pb-1">
                        {rows.map(({ item, dayLabel, showHeader }) => (
                            <Fragment key={`${item.kind}-${item.id}`}>
                                {dayLabel && (
                                    <li role="presentation" className="mt-5 flex items-center gap-3 first:mt-4">
                                        <span className="h-px flex-1 bg-border" />
                                        <span className="text-[11px] font-medium text-muted-foreground">{dayLabel}</span>
                                        <span className="h-px flex-1 bg-border" />
                                    </li>
                                )}
                                <li>
                                    {item.kind === "comment" ? (
                                        <CommentMessage
                                            comment={item}
                                            members={members}
                                            isOwn={item.author.id === currentUserId}
                                            canModerate={canModerate}
                                            showHeader={showHeader}
                                            updateComment={updateComment}
                                            deleteComment={deleteComment}
                                        />
                                    ) : (
                                        <EventLine event={item} />
                                    )}
                                </li>
                            </Fragment>
                        ))}
                    </ol>
                )}
            </div>

            {/* Above the list so the @mention list can overlap it. */}
            <div className="relative z-30 rounded-b-2xl border-t border-border bg-card px-3 pb-2 pt-3 sm:px-4">{composer}</div>
        </section>
    );
}
