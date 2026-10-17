"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import ConfirmationModal from "@/components/ui/Modal";

type DeleteAttachmentButtonProps = {
    action: () => Promise<void>;
    /** Named in the button label and the confirmation. */
    filename?: string;
};

export function DeleteAttachmentButton({ action, filename }: DeleteAttachmentButtonProps) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleConfirm() {
        setError(null);
        startTransition(async () => {
            try {
                await action();
                setOpen(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't delete the attachment. Please try again.");
            }
        });
    }

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setError(null);
                    setOpen(true);
                }}
                disabled={isPending}
                aria-label={filename ? `Delete ${filename}` : "Delete attachment"}
                title="Delete"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Trash2 className="size-4" aria-hidden="true" />
            </button>

            <ConfirmationModal
                open={open}
                title="Delete attachment?"
                description={
                    filename ? (
                        <>
                            <span className="font-medium text-foreground">{filename}</span> will be removed from this
                            task for everyone.
                        </>
                    ) : (
                        "The file will be removed from this task for everyone."
                    )
                }
                confirmLabel="Delete"
                loading={isPending}
                loadingLabel="Deleting..."
                error={error}
                onConfirm={handleConfirm}
                onClose={() => setOpen(false)}
            />
        </>
    );
}
