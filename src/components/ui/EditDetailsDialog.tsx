"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Loader2, X } from "lucide-react";

import { buttonStyles } from "@/app/style/button-style";

export type EditDetailsState = { success?: boolean; error?: string };

/** Rename / describe a workspace or project in a small dialog. */
export function EditDetailsDialog({
    open,
    onClose,
    action,
    title,
    nameLabel,
    defaultName,
    defaultDescription,
    nameMaxLength,
    descriptionMaxLength,
}: {
    open: boolean;
    onClose: () => void;
    action: (state: EditDetailsState, formData: FormData) => Promise<EditDetailsState>;
    title: string;
    nameLabel: string;
    defaultName: string;
    defaultDescription: string | null;
    nameMaxLength: number;
    descriptionMaxLength: number;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const nameId = useId();
    const descriptionId = useId();
    const [state, formAction, isPending] = useActionState(async (previous: EditDetailsState, formData: FormData) => {
        const result = await action(previous, formData);
        if (result.success) onClose();
        return result;
    }, {});

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    const field =
        "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-brand focus:ring-4 focus:ring-brand/15";

    return (
        <dialog
            ref={ref}
            aria-label={title}
            onClose={onClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) event.currentTarget.close();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-[0_24px_64px_-12px_rgba(15,17,21,0.35)] backdrop:bg-[#0f1115]/40 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[shell-pop_140ms_ease-out]"
        >
            {open && (
                <form action={formAction} className="p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">{title}</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor={nameId} className="text-[13px] font-medium">
                                {nameLabel}
                            </label>
                            <input
                                id={nameId}
                                name="name"
                                required
                                autoFocus
                                defaultValue={defaultName}
                                maxLength={nameMaxLength}
                                className={field}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor={descriptionId} className="text-[13px] font-medium">
                                Description <span className="font-normal text-muted-foreground">(optional)</span>
                            </label>
                            <textarea
                                id={descriptionId}
                                name="description"
                                rows={3}
                                defaultValue={defaultDescription ?? ""}
                                maxLength={descriptionMaxLength}
                                className={`${field} resize-y`}
                            />
                        </div>
                        {state.error && (
                            <p role="alert" className="text-sm font-medium text-danger">
                                {state.error}
                            </p>
                        )}
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className={buttonStyles({ variant: "secondary" })}>
                            Cancel
                        </button>
                        <button type="submit" disabled={isPending} className={buttonStyles()}>
                            {isPending && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
                            {isPending ? "Saving..." : "Save changes"}
                        </button>
                    </div>
                </form>
            )}
        </dialog>
    );
}
