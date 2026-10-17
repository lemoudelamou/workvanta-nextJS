"use client";

import { Check, Loader2, MessageSquare, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { smallPrimaryButton, smallGhostButton, editFieldClass } from "@/app/style/ui-tokens";
import ConfirmationModal from "@/components/ui/Modal";
import { personColor } from "@/lib/ui/person-color";

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
const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];


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
                className="rounded-md bg-brand-soft px-1 py-0.5 font-medium text-brand dark:bg-brand/15"
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

function Avatar({ author }: { author: Author }) {
    if (author.image) {
        return (
            <Image
                src={author.image}
                alt={getDisplayName(author)}
                width={32}
                height={32}
                className="size-8 rounded-full object-cover"
            />
        );
    }

    return (
        <div
            className={`flex size-8 items-center justify-center rounded-full text-[11px] font-semibold ${personColor(author.email)}`}
        >
            {getInitials(author.name, author.email)}
        </div>
    );
}

function CommentBody({ content, members }: { content: string; members: Author[] }) {
    return (
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
            {renderCommentContent(content, members)}
        </p>
    );
}

const actionButton =
    "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50";

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
                setError(err instanceof Error && err.message ? err.message : failure);
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
            loadingLabel: "Deleting...",
            onConfirm: confirm,
            onClose: () => setOpen(false),
        },
    };
}

function ModeratorDeleteButton({
    commentId,
    authorName,
    deleteComment,
}: {
    commentId: string;
    authorName: string;
    deleteComment: DeleteComment;
}) {
    const { isPending, ask, modalProps } = useDeleteConfirmation(
        commentId,
        deleteComment,
        "Couldn't remove the comment. Please try again.",
    );

    return (
        <>
            <div className="mt-1 flex items-center gap-1">
                <button
                    type="button"
                    onClick={ask}
                    disabled={isPending}
                    className={`${actionButton} hover:bg-danger/10 hover:text-danger`}
                >
                    {isPending ? (
                        <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
                    ) : (
                        <Trash2 className="size-3" aria-hidden="true" />
                    )}
                    Remove
                </button>
            </div>

            <ConfirmationModal
                {...modalProps}
                title="Remove comment?"
                description={`${authorName}'s comment will be removed for everyone. This can't be undone.`}
                confirmLabel="Remove"
                loadingLabel="Removing..."
            />
        </>
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
    const [isSaving, startTransition] = useTransition();
    const deletion = useDeleteConfirmation(comment.id, deleteComment, "Couldn't delete the comment. Please try again.");

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

    if (editing) {
        return (
            <div className="mt-2">
                <label className="sr-only" htmlFor={`edit-${comment.id}`}>
                    Edit comment
                </label>
                <textarea
                    id={`edit-${comment.id}`}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={MAX_LENGTH}
                    rows={3}
                    disabled={isSaving}
                    autoFocus
                    className={editFieldClass}
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !content.trim()}
                        className={smallPrimaryButton}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="size-3.5" aria-hidden="true" />
                                Save changes
                            </>
                        )}
                    </button>

                    <button type="button" onClick={cancelEditing} disabled={isSaving} className={smallGhostButton}>
                        Cancel
                    </button>

                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {content.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
                    </span>
                </div>

                {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
            </div>
        );
    }

    return (
        <>
            <CommentBody content={comment.content} members={members} />

            <div className="mt-1 -ml-2 flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={startEditing}
                    className={`${actionButton} hover:bg-muted hover:text-foreground`}
                >
                    <Pencil className="size-3" aria-hidden="true" />
                    Edit
                </button>

                <button
                    type="button"
                    onClick={deletion.ask}
                    disabled={deletion.isPending}
                    className={`${actionButton} hover:bg-danger/10 hover:text-danger`}
                >
                    <Trash2 className="size-3" aria-hidden="true" />
                    {deletion.isPending ? "Deleting..." : "Delete"}
                </button>
            </div>

            {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}

            <ConfirmationModal
                {...deletion.modalProps}
                title="Delete comment?"
                description="Your comment will be removed for everyone. This can't be undone."
                confirmLabel="Delete"
            />
        </>
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
        <section className="relative overflow-visible rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)]">
            <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-foreground">Comments</h2>
                <span className="min-w-5 rounded-full bg-muted px-1.5 text-center text-xs font-medium leading-5 tabular-nums text-muted-foreground">
                    {total}
                </span>
            </div>

            {hiddenCount > 0 && showAllHref && (
                <div className="border-t border-border px-4 py-2.5 text-center sm:px-5">
                    <Link
                        href={showAllHref}
                        scroll={false}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                        Show {hiddenCount} earlier {hiddenCount === 1 ? "comment" : "comments"}
                    </Link>
                </div>
            )}

            {comments.length === 0 ? (
                <div className="flex items-center gap-3 border-t border-border px-4 py-4 sm:px-5">
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                        No comments yet. Share an update or ask a question below.
                    </p>
                </div>
            ) : (
                <ol className="divide-y divide-border border-t border-border">
                    {comments.map((comment) => {
                        const isCurrentUser = comment.author.id === currentUserId;

                        return (
                            <li key={comment.id} className="flex gap-3 px-4 py-4 sm:px-5">
                                <div className="shrink-0 pt-0.5">
                                    <Avatar author={comment.author} />
                                </div>

                                <article className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                        <span className="text-sm font-semibold text-foreground">
                                            {getDisplayName(comment.author)}
                                        </span>
                                        {isCurrentUser && (
                                            <span className="text-xs font-medium text-muted-foreground">(you)</span>
                                        )}
                                        <time
                                            dateTime={new Date(comment.createdAt).toISOString()}
                                            className="text-xs text-muted-foreground"
                                        >
                                            {formatCommentDate(comment.createdAt)}
                                        </time>
                                        {wasEdited(comment) && (
                                            <span className="text-xs italic text-muted-foreground">edited</span>
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
                                            <CommentBody content={comment.content} members={members} />
                                            {canModerate && (
                                                <div className="-ml-2">
                                                    <ModeratorDeleteButton
                                                        commentId={comment.id}
                                                        authorName={getDisplayName(comment.author)}
                                                        deleteComment={deleteComment}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </article>
                            </li>
                        );
                    })}
                </ol>
            )}

            {/* z-index keeps the mention dropdown above what follows */}
            <div className="relative z-30 rounded-b-xl border-t border-border bg-muted/30 p-4 sm:px-5">
                <div className="relative z-40 overflow-visible">{form}</div>
            </div>
        </section>
    );
}
