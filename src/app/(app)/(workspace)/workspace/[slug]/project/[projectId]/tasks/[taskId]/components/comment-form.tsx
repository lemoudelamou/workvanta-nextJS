"use client";

import { AtSign, Send } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { formatNumber } from "./task-meta";
import { personColor } from "@/lib/ui/person-color";

type Member = {
  id: string;
  name: string | null;
  email: string;
};

type CommentFormProps = {
  action: (formData: FormData) => void | Promise<unknown>;
  members: Member[];
};

const MAX_LENGTH = 5000;
const WARNING_THRESHOLD = 4500;
const MAX_SUGGESTIONS = 8;

const MENTION_TRIGGER = /(^|\s)@([a-zA-Z0-9._-]*)$/;


function getInitials(name: string | null, email: string) {
  const value = name?.trim() || email;
  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

function getMentionMatch(text: string, cursor: number) {
  return text.slice(0, cursor).match(MENTION_TRIGGER);
}

function getErrorMessage(result: unknown) {
  if (
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
  ) {
    return result.error;
  }

  return null;
}

export function CommentForm({ action, members }: CommentFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = mentionQuery.toLowerCase();

  const suggestions = members
      .filter(
          (member) =>
              member.name?.toLowerCase().includes(query) ||
              member.email.toLowerCase().includes(query),
      )
      .slice(0, MAX_SUGGESTIONS);

  const isMentionListOpen = showMentions && suggestions.length > 0;
  const lifted = isMentionListOpen ? "z-50" : "";

  function closeMentions() {
    setShowMentions(false);
    setMentionQuery("");
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const { value, selectionStart } = event.target;

    setContent(value);
    setError(null);

    const match = getMentionMatch(value, selectionStart);

    if (match) {
      setMentionQuery(match[2] ?? "");
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }

  function selectMember(member: Member) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const match = getMentionMatch(content, cursor);
    if (!match) return;

    const mentionStart = cursor - match[2].length - 1;
    const before = content.slice(0, mentionStart);
    const after = content.slice(cursor);

    const displayName = member.name ?? member.email;
    const mention = `@[${displayName}](${member.email})`;

    setContent(`${before}${mention} ${after}`);
    closeMentions();

    requestAnimationFrame(() => {
      const position = before.length + mention.length + 1;
      textarea.focus();
      textarea.setSelectionRange(position, position);
    });
  }

  async function handleSubmit(formData: FormData) {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      formData.set("content", content);

      const result = await action(formData);
      const message = getErrorMessage(result);

      if (message) {
        setError(message);
        return;
      }

      setContent("");
      closeMentions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <form action={handleSubmit} className={`relative ${lifted}`}>
        <div
            className={`group relative rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04)] transition-shadow focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 ${lifted}`}
        >
          <label htmlFor="new-comment" className="sr-only">
            Comment
          </label>
          <textarea
              id="new-comment"
              ref={textareaRef}
              name="content"
              value={content}
              onChange={handleChange}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && content.trim()) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
                if (event.key === "Escape") closeMentions();
              }}
              rows={content ? 3 : 2}
              placeholder="Leave a comment…"
              required
              maxLength={MAX_LENGTH}
              className="block w-full resize-none rounded-t-xl bg-transparent px-3.5 pt-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />

          <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5 pt-1">
            <span className="flex min-w-0 items-center gap-1.5 pl-1 text-xs text-muted-foreground">
              {content.length > WARNING_THRESHOLD ? (
                  <span className="tabular-nums text-amber-700 dark:text-amber-300">
                    {formatNumber(content.length)} / {formatNumber(MAX_LENGTH)}
                  </span>
              ) : (
                  <>
                    <AtSign className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">to mention someone</span>
                  </>
              )}
            </span>

            <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#0f1115]"
            >
              <Send className="size-3.5" aria-hidden="true" />
              {isSubmitting ? "Posting..." : "Comment"}
            </button>
          </div>

          {isMentionListOpen && (
              <div className="absolute left-0 top-full z-[100] mt-2 w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_-12px_rgba(15,17,21,0.3)]">
                <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                  {mentionQuery ? `People matching “${mentionQuery}”` : "Mention someone"}
                </p>
                <div className="max-h-64 overflow-y-auto p-1">
                  {suggestions.map((member) => (
                      <button
                          key={member.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectMember(member)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                      >
                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${personColor(member.email)}`}>
                          {getInitials(member.name, member.email)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground">
                            {member.name ?? member.email}
                          </span>
                          {member.name && (
                              <span className="block truncate text-[11px] text-muted-foreground">{member.email}</span>
                          )}
                        </span>
                      </button>
                  ))}
                </div>
              </div>
          )}
        </div>

        {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {error}
            </p>
        )}
      </form>
  );
}
