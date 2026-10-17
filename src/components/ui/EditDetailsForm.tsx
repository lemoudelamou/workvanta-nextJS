"use client";

import { useActionState } from "react";
import { Loader2, Pencil } from "lucide-react";

import { buttonStyles } from "@/app/style/button-style";
import { Field, Input, Textarea } from "@/components/ui/FormField";

export type EditDetailsState = { success?: boolean; error?: string };

type EditDetailsFormProps = {
    /** Server action, already bound to the workspace/project it edits. */
    action: (state: EditDetailsState, formData: FormData) => Promise<EditDetailsState>;
    title: string;
    description: string;
    defaultName: string;
    defaultDescription: string | null;
    nameLabel: string;
    nameMaxLength: number;
    descriptionMaxLength: number;
};

/** Collapsible "Edit details" panel used for workspaces and projects. */
export function EditDetailsForm({
    action,
    title,
    description,
    defaultName,
    defaultDescription,
    nameLabel,
    nameMaxLength,
    descriptionMaxLength,
}: EditDetailsFormProps) {
    const [state, formAction, isPending] = useActionState(action, {});

    return (
        <details className="group mt-14 rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
                <div className="flex items-start gap-3">
                    <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"
                    >
                        <Pencil className="size-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
                <span className="text-sm font-medium text-muted-foreground group-open:hidden">
                    Edit
                </span>
            </summary>

            <form action={formAction} className="space-y-5 border-t border-border p-5">
                <Field label={nameLabel}>
                    <Input
                        required
                        name="name"
                        defaultValue={defaultName}
                        maxLength={nameMaxLength}
                    />
                </Field>

                <Field label="Description" optional>
                    <Textarea
                        name="description"
                        rows={3}
                        defaultValue={defaultDescription ?? ""}
                        maxLength={descriptionMaxLength}
                    />
                </Field>

                {state.error && (
                    <p role="alert" className="text-sm font-medium text-danger">
                        {state.error}
                    </p>
                )}

                {state.success && !isPending && (
                    <p role="status" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Changes saved.
                    </p>
                )}

                <div className="flex justify-end">
                    <button type="submit" disabled={isPending} className={buttonStyles()}>
                        {isPending && <Loader2 className="size-4 motion-safe:animate-spin" />}
                        {isPending ? "Saving..." : "Save changes"}
                    </button>
                </div>
            </form>
        </details>
    );
}
