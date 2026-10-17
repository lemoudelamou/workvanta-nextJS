"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { clearEditor, MentionEditor, visibleText, type MentionMember } from "./mention-editor";
import { formatNumber } from "./task-meta";

type CommentFormProps = {
    action: (formData: FormData) => void | Promise<unknown>;
    members: MentionMember[];
};

const MAX_LENGTH = 5000;
const WARNING_THRESHOLD = 4500;

function resultError(result: unknown) {
    if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
        return result.error;
    }
    return null;
}

/** The comment box: Enter sends, Shift+Enter adds a line, @ mentions someone. */
export function CommentForm({ action, members }: CommentFormProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const length = visibleText(content).length;
    const tooLong = content.length > MAX_LENGTH;
    const canSend = !!content.trim() && !tooLong && !isSubmitting;

    async function submit() {
        if (!canSend) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.set("content", content);
            const message = resultError(await action(formData));
            if (message) {
                setError(message);
                return;
            }
            if (editorRef.current) clearEditor(editorRef.current);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't post the comment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                void submit();
            }}
        >
            <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background py-1.5 pl-3.5 pr-1.5 transition-shadow focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
                <div className="min-w-0 flex-1 py-1">
                    <MentionEditor
                        editorRef={editorRef}
                        members={members}
                        label="Comment"
                        placeholder="Write a comment… type @ to mention"
                        menuPlacement="top"
                        disabled={isSubmitting}
                        onChange={(value) => {
                            setContent(value);
                            setError(null);
                        }}
                        onSubmit={() => void submit()}
                        className="max-h-48 min-h-6 overflow-y-auto text-sm leading-6 text-foreground"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!canSend}
                    aria-label="Send comment"
                    title="Send (Enter)"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-white outline-none transition-[background-color,opacity] hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-30 dark:text-[#0f1115]"
                >
                    {isSubmitting ? (
                        <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
                    ) : (
                        <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    )}
                </button>
            </div>

            <div className="mt-1.5 flex min-h-4 items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
                {error ? (
                    <p role="alert" className="font-medium text-danger">
                        {error}
                    </p>
                ) : (
                    <span className="hidden sm:inline">Enter to send, Shift + Enter for a new line</span>
                )}
                {length > WARNING_THRESHOLD && (
                    <span className={`ml-auto tabular-nums ${tooLong ? "text-danger" : "text-amber-700 dark:text-amber-300"}`}>
                        {formatNumber(content.length)} / {formatNumber(MAX_LENGTH)}
                    </span>
                )}
            </div>
        </form>
    );
}
