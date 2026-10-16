"use client";

import { useState, useTransition } from "react";

import ConfirmationModal from "@/components/ui/Modal";

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
                className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
            >
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