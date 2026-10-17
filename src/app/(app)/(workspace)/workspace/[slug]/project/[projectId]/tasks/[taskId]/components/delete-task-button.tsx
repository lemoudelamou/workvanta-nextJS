"use client";

import { useState, useTransition } from "react";

import ConfirmationModal from "@/components/ui/Modal";
import { Trash2 } from "lucide-react";

type DeleteTaskConfirmationProps = {
    action: () => Promise<void>;
};

export function DeleteTaskConfirmation({
    action,
}: DeleteTaskConfirmationProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    function handleConfirm() {
        startTransition(async () => {
            await action();
        });
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={isPending}
                className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            >
                <Trash2 className="size-4" aria-hidden="true" />
                {isPending ? "Deleting..." : "Delete task"}
            </button>

            <ConfirmationModal
                open={open}
                title="Delete task?"
                description={
                    <>
                        Are you sure you want to delete this task?
                        <br />
                        This action cannot be undone.
                    </>
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                loading={isPending}
                loadingLabel="Deleting..."
                onConfirm={handleConfirm}
                onClose={() => setOpen(false)}
            />
        </>
    );
}