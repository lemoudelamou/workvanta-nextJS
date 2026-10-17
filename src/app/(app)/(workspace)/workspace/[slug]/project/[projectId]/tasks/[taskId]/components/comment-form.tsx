"use client";

import { AtSign, Send, User } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { commentButton, iconTile } from "@/app/style/ui-tokens";
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
      <form action={handleSubmit} className={`relative space-y-3 ${lifted}`}>
        <div className={`group relative ${lifted}`}>
        <textarea
            ref={textareaRef}
            name="content"
            value={content}
            onChange={handleChange}
            rows={3}
            placeholder="Write a comment. Type @ to mention someone."
            required
            maxLength={MAX_LENGTH}
            className="relative w-full resize-none rounded-xl border border-slate-200 bg-white/70 px-3.5 py-3 text-sm leading-6 text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-400/15 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/[0.16] dark:focus:border-white/25 dark:focus:bg-white/[0.06] dark:focus:ring-white/10"
        />

          {isMentionListOpen && (
              <div className="absolute left-0 top-full z-[100] mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 dark:border-white/[0.1] dark:bg-slate-950 dark:shadow-black/50">
                <div className="border-b border-slate-200/70 bg-slate-50 px-3 py-2.5 dark:border-white/[0.06] dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                <span className={`${iconTile} size-7 rounded-lg`}>
                  <AtSign className="size-3.5" />
                </span>

                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Mention a teammate
                      </p>

                      {mentionQuery && (
                          <p className="text-[11px] text-muted-foreground">
                            Matching “{mentionQuery}”
                          </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto p-1.5">
                  {suggestions.map((member) => (
                      <button
                          key={member.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectMember(member)}
                          className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-200 hover:bg-slate-500/[0.07]"
                      >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${personColor(member.email)}`}>
                    {getInitials(member.name, member.email)}
                  </span>

                        <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {member.name ?? member.email}
                    </span>

                          {member.name && (
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {member.email}
                      </span>
                          )}
                  </span>

                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all duration-200 group-hover:opacity-100">
                    <User className="size-3" />
                  </span>
                      </button>
                  ))}
                </div>
              </div>
          )}
        </div>

        {error && (
            <div
                role="alert"
                className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger"
            >
              {error}
            </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {content.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
          </span>

            {content.length > WARNING_THRESHOLD && (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              Almost at limit
            </span>
            )}
          </div>

          <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className={commentButton}
          >
            <Send className="size-4" />
            {isSubmitting ? "Posting..." : "Comment"}
          </button>
        </div>
      </form>
  );
}