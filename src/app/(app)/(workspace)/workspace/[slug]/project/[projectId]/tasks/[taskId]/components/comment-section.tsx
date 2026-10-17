"use client";

import {
    Check,
    Loader2,
    MessageSquare,
    Pencil,
    Sparkles,
    Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { hairline, glass, starlightEdge, iconTile, smallPrimaryButton, smallGhostButton, bubbleClass, editFieldClass } from "@/app/style/ui-tokens";

type Author = {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
};

type Comment = {
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    author: Author;
};

type DeleteComment = (commentId: string) => void | Promise<void>;
type UpdateComment = (commentId: string, formData: FormData) => void | Promise<void>;

type CommentsSectionProps = {
    comments: Comment[];
    form: ReactNode;
    currentUserId: string;
    members: Author[];
    deleteComment: DeleteComment;
    updateComment: UpdateComment;
    /** Project admins can remove anyone's comment. */
    canModerate?: boolean;
    /** Total comments on the task; more than shown adds a "show earlier" link. */
    totalCount?: number;
    showAllHref?: string;
};

const MAX_LENGTH = 5000;
const MAX_STACKED_AVATARS = 4;
const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];


const AVATAR_VARIANTS = {
    stacked: {
        px: 28,
        box: "size-7",
        text: "text-[9px]",
        image: "ring-2 ring-white dark:ring-slate-900",
        fallback: "ring-2 ring-white dark:ring-slate-900",
    },
    full: {
        px: 40,
        box: "size-10",
        text: "text-xs",
        image: "border border-slate-200 dark:border-white/[0.08]",
        fallback: "",
    },
} as const;

export function formatCommentDate(date: string | Date) {
    const value = new Date(date);

    const month = MONTHS[value.getUTCMonth()];
    const day = value.getUTCDate();
    const year = value.getUTCFullYear();

    const hours = value.getUTCHours();
    const minutes = String(value.getUTCMinutes()).padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    const hour = hours % 12 || 12;

    return `${month} ${day}, ${year} at ${hour}:${minutes} ${period}`;
}

function getInitials(name: string | null, email: string) {
    const value = name?.trim() || email;
    const parts = value.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return value.slice(0, 2).toUpperCase();
}

function getDisplayName(author: Author) {
    return author.name ?? author.email;
}

function wasEdited(comment: Comment) {
    return new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime();
}

function renderCommentContent(content: string, members: Author[]) {
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    for (const match of content.matchAll(MENTION_PATTERN)) {
        const [fullMatch, displayName, email] = match;
        const start = match.index;

        if (start === undefined) continue;

        if (start > lastIndex) {
            parts.push(<span key={`text-${start}`}>{content.slice(lastIndex, start)}</span>);
        }

        const member = members.find(
            (m) => m.email.toLowerCase() === email.toLowerCase(),
        );

        parts.push(
            <span
                key={`mention-${start}`}
                className="rounded-md bg-slate-900/[0.06] px-1.5 py-0.5 font-semibold text-slate-950 dark:bg-white/[0.1] dark:text-white"
            >
        @{member?.name ?? displayName}
      </span>,
        );

        lastIndex = start + fullMatch.length;
    }

    if (lastIndex < content.length) {
        parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>);
    }

    return parts;
}

function Avatar({
                    author,
                    variant,
                }: {
    author: Author;
    variant: keyof typeof AVATAR_VARIANTS;
}) {
    const v = AVATAR_VARIANTS[variant];

    if (author.image) {
        return (
            <Image
                src={author.image}
                alt={getDisplayName(author)}
                width={v.px}
                height={v.px}
                className={`${v.box} rounded-full object-cover ${v.image}`}
            />
        );
    }

    return (
        <div
            className={`${v.box} flex items-center justify-center rounded-full bg-slate-900 ${v.text} font-bold text-white dark:bg-white dark:text-slate-950 ${v.fallback}`}
        >
            {getInitials(author.name, author.email)}
        </div>
    );
}

function CommentBubble({
                           content,
                           members,
                           className = "",
                       }: {
    content: string;
    members: Author[];
    className?: string;
}) {
    return (
        <div className={`${bubbleClass} ${className}`}>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">
                {renderCommentContent(content, members)}
            </p>
        </div>
    );
}

function ModeratorDeleteButton({
                                   commentId,
                                   deleteComment,
                               }: {
    commentId: string;
    deleteComment: DeleteComment;
}) {
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleDelete() {
        if (!window.confirm("Remove this comment for everyone?")) return;

        setError(null);
        startTransition(async () => {
            try {
                await deleteComment(commentId);
            } catch {
                setError("Failed to remove comment.");
            }
        });
    }

    return (
        <div className="mt-2 flex items-center gap-2">
            <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-60 dark:text-slate-400 dark:hover:text-rose-300"
            >
                {isPending ? (
                    <Loader2 className="size-3 motion-safe:animate-spin" />
                ) : (
                    <Trash2 className="size-3" />
                )}
                Remove
            </button>
            {error && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
            )}
        </div>
    );
}

function OwnCommentActions({
                               comment,
                               members,
                               updateComment,
                               deleteComment,
                           }: {
    comment: Comment;
    members: Author[];
    updateComment: UpdateComment;
    deleteComment: DeleteComment;
}) {
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(comment.content);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function startEditing() {
        setError(null);
        setEditing(true);
    }

    function cancelEditing() {
        setContent(comment.content);
        setError(null);
        setEditing(false);
    }

    function handleSave() {
        if (!content.trim()) return;

        setError(null);

        const formData = new FormData();
        formData.set("content", content.trim());

        startTransition(async () => {
            try {
                await updateComment(comment.id, formData);
                setEditing(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update comment.");
            }
        });
    }

    function handleDelete() {
        if (!window.confirm("Delete this comment?")) return;

        setError(null);

        startTransition(async () => {
            try {
                await deleteComment(comment.id);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete comment.");
            }
        });
    }

    if (editing) {
        return (
            <div
                className={`${hairline} mt-4 overflow-hidden rounded-2xl bg-white/90 dark:bg-slate-900/90`}
            >
                <div className="border-b border-slate-200/70 bg-slate-50/70 px-4 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
            <span className={`${iconTile} size-8 rounded-xl`}>
              <Pencil className="size-3.5" />
            </span>

                        <div>
                            <p className="text-xs font-semibold text-slate-950 dark:text-white">
                                Edit comment
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Update your message and save the changes.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4">
          <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={MAX_LENGTH}
              rows={4}
              disabled={isPending}
              autoFocus
              className={editFieldClass}
          />

                    <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {content.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
            </span>

                        {error && (
                            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isPending || !content.trim()}
                            className={smallPrimaryButton}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="size-3.5 motion-safe:animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="size-3.5" />
                                    Save changes
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={isPending}
                            className={smallGhostButton}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3">
            <CommentBubble content={comment.content} members={members} />

            <div className="mt-2 flex items-center gap-1">
                <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-500/10 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                >
                    <Pencil className="size-3" />
                    Edit
                </button>

                <span className="text-slate-300 dark:text-slate-600">•</span>

                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-rose-600 transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400 dark:hover:text-rose-300"
                >
                    <Trash2 className="size-3" />
                    {isPending ? "Deleting..." : "Delete"}
                </button>
            </div>

            {error && (
                <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                    {error}
                </p>
            )}
        </div>
    );
}

export function CommentsSection({
                                    comments,
                                    form,
                                    currentUserId,
                                    members,
                                    deleteComment,
                                    updateComment,
                                    canModerate = false,
                                    totalCount,
                                    showAllHref,
                                }: CommentsSectionProps) {
    const total = totalCount ?? comments.length;
    const hiddenCount = Math.max(0, total - comments.length);

    return (
        // overflow-visible on purpose: the mention dropdown extends below the composer
        <section
            className={`${glass} ${hairline} ${starlightEdge} relative overflow-visible rounded-2xl`}
        >
            <div className="relative border-b border-slate-200/70 px-5 py-5 sm:px-6 dark:border-white/[0.06]">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className={`${iconTile} size-10 rounded-xl`}>
                            <MessageSquare className="size-5" />
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg dark:text-white">
                                    Comments
                                </h2>

                                <span
                                    className={`${hairline} inline-flex min-w-6 items-center justify-center rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-white/[0.04] dark:text-slate-300`}
                                >
                  {total}
                </span>
                            </div>

                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                                Discuss progress, ask questions, and keep the conversation here.
                            </p>
                        </div>
                    </div>

                    {comments.length > 0 && (
                        <div className="hidden shrink-0 items-center -space-x-2 sm:flex">
                            {comments.slice(0, MAX_STACKED_AVATARS).map((comment) => (
                                <Avatar key={comment.id} author={comment.author} variant="stacked" />
                            ))}

                            {comments.length > MAX_STACKED_AVATARS && (
                                <div className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-700 ring-2 ring-white dark:bg-white/[0.12] dark:text-slate-200 dark:ring-slate-900">
                                    +{comments.length - MAX_STACKED_AVATARS}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="relative divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                {hiddenCount > 0 && showAllHref && (
                    <div className="px-5 py-3 text-center sm:px-6">
                        <Link
                            href={showAllHref}
                            scroll={false}
                            className="text-sm font-medium text-slate-600 hover:text-slate-950 hover:underline dark:text-slate-300 dark:hover:text-white"
                        >
                            Show {hiddenCount} earlier {hiddenCount === 1 ? "comment" : "comments"}
                        </Link>
                    </div>
                )}
                {comments.length === 0 ? (
                    <div className="px-5 py-12 text-center sm:px-6">
                        <div className={`${iconTile} mx-auto size-14 rounded-2xl border-dashed`}>
                            <MessageSquare className="size-6" />
                        </div>

                        <h3 className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">
                            No comments yet
                        </h3>

                        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-slate-500 sm:text-sm dark:text-slate-400">
                            Start the conversation by sharing an update, question, or useful
                            context about this task.
                        </p>
                    </div>
                ) : (
                    comments.map((comment) => {
                        const isCurrentUser = comment.author.id === currentUserId;

                        return (
                            <article
                                key={comment.id}
                                className="group relative px-5 py-5 transition-colors duration-200 hover:bg-slate-500/[0.03] sm:px-6"
                            >
                                <div className="flex gap-3.5 sm:gap-4">
                                    <div className="shrink-0">
                                        <Avatar author={comment.author} variant="full" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {getDisplayName(comment.author)}
                      </span>

                                            {isCurrentUser && (
                                                <span
                                                    className={`${hairline} rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/[0.04] dark:text-slate-300`}
                                                >
                          You
                        </span>
                                            )}

                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatCommentDate(comment.createdAt)}
                      </span>

                                            {wasEdited(comment) && (
                                                <>
                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                    <span className="text-xs italic text-slate-500 dark:text-slate-400">
                            edited
                          </span>
                                                </>
                                            )}
                                        </div>

                                        {isCurrentUser ? (
                                            <OwnCommentActions
                                                comment={comment}
                                                members={members}
                                                updateComment={updateComment}
                                                deleteComment={deleteComment}
                                            />
                                        ) : (
                                            <>
                                                <CommentBubble
                                                    content={comment.content}
                                                    members={members}
                                                    className="mt-3"
                                                />
                                                {canModerate && (
                                                    <ModeratorDeleteButton
                                                        commentId={comment.id}
                                                        deleteComment={deleteComment}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>

            {/* z-index layers keep the mention dropdown above what follows */}
            <div className="relative z-30 rounded-b-2xl border-t border-slate-200/70 bg-slate-100/50 p-4 sm:p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <div className="mb-3 flex items-center gap-2.5">
                    <div className={`${iconTile} size-7 rounded-lg`}>
                        <Sparkles className="size-3.5" />
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-slate-950 dark:text-white">
                            Add a comment
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Mention teammates with @
                        </p>
                    </div>
                </div>

                <div className="relative z-40 overflow-visible">{form}</div>
            </div>
        </section>
    );
}