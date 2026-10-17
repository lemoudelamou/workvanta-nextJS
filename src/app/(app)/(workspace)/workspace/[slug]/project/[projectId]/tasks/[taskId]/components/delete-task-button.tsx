"use client";

import { useState, useTransition } from "react";

import ConfirmationModal from "@/components/ui/Modal";
import { buttonStyles } from "@/app/style/button-style";

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
                className={`${buttonStyles({ variant: "danger" })} shrink-0`}
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