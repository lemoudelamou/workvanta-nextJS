"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";

import { errorMessage, isRedirect, taskFormData, type TaskValues, type UpdateTask } from "./task-meta";

const editingRing =
    "w-full rounded-lg border border-border bg-card outline-none transition-shadow focus:border-brand focus:ring-4 focus:ring-brand/15";

/**
 * Title and description. Editors click either one to edit it in place:
 * Enter (or ⌘/Ctrl+Enter for the description) saves, Escape cancels.
 */
export function TaskHeader({
    values,
    canEdit,
    updateTask,
}: {
    values: TaskValues;
    canEdit: boolean;
    updateTask: UpdateTask;
}) {
    const [editing, setEditing] = useState<"title" | "description" | null>(null);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startTransition] = useTransition();
    // Enter/Escape already handled the edit; ignore the blur that follows.
    const settled = useRef(false);

    function edit(field: "title" | "description") {
        settled.current = false;
        setDraft(values[field]);
        setError(null);
        setEditing(field);
    }

    function cancel() {
        settled.current = true;
        setEditing(null);
        setError(null);
    }

    function save() {
        if (!editing || settled.current) return;
        const next = draft.trim();
        if (next === values[editing].trim()) return cancel();
        if (editing === "title" && next.length < 2) {
            setError("Give the task a title of at least 2 characters.");
            return;
        }

        setError(null);
        settled.current = true;
        startTransition(async () => {
            try {
                await updateTask(taskFormData({ ...values, [editing]: next }));
                setEditing(null);
            } catch (err) {
                if (isRedirect(err)) throw err;
                settled.current = false;
                setError(errorMessage(err, "Couldn't save that change. Please try again."));
            }
        });
    }

    function onKeyDown(event: KeyboardEvent, multiline: boolean) {
        if (event.key === "Escape") {
            event.preventDefault();
            cancel();
        } else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            save();
        }
    }

    const titleClass = "break-words text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]";

    return (
        <div>
            {editing === "title" ? (
                <div>
                    <label htmlFor="task-title" className="sr-only">
                        Title
                    </label>
                    <input
                        id="task-title"
                        autoFocus
                        value={draft}
                        maxLength={200}
                        disabled={isSaving}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => onKeyDown(event, false)}
                        onBlur={save}
                        className={`${editingRing} -mx-2 px-2 py-0.5 ${titleClass}`}
                    />
                </div>
            ) : (
                <h1 className={titleClass}>
                    {canEdit ? (
                        <button
                            type="button"
                            onClick={() => edit("title")}
                            title="Click to rename"
                            className="-mx-2 rounded-lg px-2 text-left outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            {values.title}
                        </button>
                    ) : (
                        values.title
                    )}
                </h1>
            )}

            <div className="mt-3">
                {editing === "description" ? (
                    <div>
                        <label htmlFor="task-description" className="sr-only">
                            Description
                        </label>
                        <textarea
                            id="task-description"
                            autoFocus
                            value={draft}
                            rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
                            maxLength={2000}
                            disabled={isSaving}
                            placeholder="What needs to happen, and why?"
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => onKeyDown(event, true)}
                            className={`${editingRing} -mx-3 w-[calc(100%+1.5rem)] resize-y px-3 py-2 text-[15px] leading-7 text-foreground`}
                        />
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={save}
                                disabled={isSaving}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60 dark:text-[#0f1115]"
                            >
                                {isSaving && <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />}
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={cancel}
                                disabled={isSaving}
                                className="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
                                Ctrl + Enter to save
                            </span>
                        </div>
                    </div>
                ) : canEdit ? (
                    <button
                        type="button"
                        onClick={() => edit("description")}
                        className="-mx-3 block w-[calc(100%+1.5rem)] rounded-lg px-3 py-1.5 text-left outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-brand"
                    >
                        {values.description ? (
                            <span className="block whitespace-pre-wrap text-[15px] leading-7 text-foreground/80">
                                {values.description}
                            </span>
                        ) : (
                            <span className="block text-[15px] leading-7 text-muted-foreground">
                                Add a description…
                            </span>
                        )}
                    </button>
                ) : values.description ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/80">{values.description}</p>
                ) : (
                    <p className="text-[15px] text-muted-foreground">No description yet.</p>
                )}
            </div>

            {error && (
                <p role="alert" className="mt-2 text-sm font-medium text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}
