"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";

import { buttonStyles } from "@/app/style/button-style";
import { TaskFormFields, type TaskFormMember } from "@/components/ui/TaskFormFields";
import type { TaskStatus } from "@/lib/task-status";
import { createTaskAction } from "./project-actions";

export function CreateTaskDialog({
                                     open,
                                     onClose,
                                     slug,
                                     projectId,
                                     defaultStatus,
                                     members,
                                 }: {
    open: boolean;
    onClose: () => void;
    slug: string;
    projectId: string;
    defaultStatus: TaskStatus;
    members: TaskFormMember[];
}) {
    const ref = useRef<HTMLDialogElement>(null);


    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => {
                if (e.target === ref.current) onClose();
            }}
            aria-labelledby="create-task-title"
            className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-0 text-slate-950 shadow-xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-white/10 dark:bg-slate-900 dark:text-white"
        >

            {open && (
                <CreateTaskForm
                    slug={slug}
                    projectId={projectId}
                    defaultStatus={defaultStatus}
                    members={members}
                    onClose={onClose}
                />
            )}
        </dialog>
    );
}

function CreateTaskForm({
                            slug,
                            projectId,
                            defaultStatus,
                            members,
                            onClose,
                        }: {
    slug: string;
    projectId: string;
    defaultStatus: TaskStatus;
    members: TaskFormMember[];
    onClose: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [addAnother, setAddAnother] = useState(false);
    const [pending, startTransition] = useTransition();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        setError(null);

        startTransition(async () => {
            try {
                const result = await createTaskAction(slug, projectId, formData);

                if (result.error) {
                    setError(result.error);
                    return;
                }

                if (addAnother) {
                    for (const name of ["title", "description"]) {
                        const el = form.elements.namedItem(name);
                        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                            el.value = "";
                        }
                    }
                    const title = form.elements.namedItem("title");
                    if (title instanceof HTMLInputElement) title.focus();
                } else {
                    onClose();
                }
            } catch {
                setError("Something went wrong. Please try again.");
            }
        });
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
                <div>
                    <h2 id="create-task-title" className="text-lg font-semibold tracking-tight">
                        New task
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Only a title is required.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[0.06] dark:hover:text-white"
                >
                    <X className="size-4" />
                </button>
            </div>

            <div className="space-y-5 px-6 py-5">
                {error && (
                    <p
                        role="alert"
                        className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300"
                    >
                        {error}
                    </p>
                )}

                <TaskFormFields
                    members={members}
                    defaultStatus={defaultStatus}
                    collapseDescription
                />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <input
                        type="checkbox"
                        checked={addAnother}
                        onChange={(e) => setAddAnother(e.target.checked)}
                        className="size-4 rounded border-slate-300 accent-violet-600"
                    />
                    Create another
                </label>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className={buttonStyles({ variant: "secondary" })}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={pending}
                        className={buttonStyles({ className: "disabled:opacity-60" })}
                    >
                        {pending ? "Creating…" : "Create task"}
                    </button>
                </div>
            </div>
        </form>
    );
}