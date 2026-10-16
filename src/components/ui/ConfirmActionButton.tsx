"use client";

import { useCallback, useState, useTransition } from "react";

import Modal from "@/components/ui/Modal";
import { buttonStyles } from "@/app/style/button-style";

type ConfirmActionButtonProps = {
    /** Server action; return `{ error }` to show it in the dialog. */
    action: () => Promise<{ error?: string } | void>;
    label: React.ReactNode;
    ariaLabel?: string;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    loadingLabel?: string;
    variant?: "primary" | "secondary" | "danger";
    size?: "sm" | "md" | "lg";
};

/** A button that asks for confirmation, then runs a server action. */
export function ConfirmActionButton({
    action,
    label,
    ariaLabel,
    title,
    description,
    confirmLabel,
    loadingLabel = "Working...",
    variant = "danger",
    size = "md",
}: ConfirmActionButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const close = useCallback(() => {
        if (!isPending) {
            setError(null);
            setIsOpen(false);
        }
    }, [isPending]);

    const confirm = useCallback(() => {
        setError(null);
        startTransition(async () => {
            try {
                const result = await action();
                if (result?.error) {
                    setError(result.error);
                    return;
                }
                setIsOpen(false);
            } catch {
                setError("Something went wrong. Please try again.");
            }
        });
    }, [action]);

    return (
        <>
            <button
                type="button"
                aria-label={ariaLabel}
                onClick={() => setIsOpen(true)}
                className={buttonStyles({ variant, size })}
            >
                {label}
            </button>
            <Modal
                open={isOpen}
                title={title}
                description={description}
                confirmLabel={confirmLabel}
                loading={isPending}
                loadingLabel={loadingLabel}
                error={error}
                onConfirm={confirm}
                onClose={close}
            />
        </>
    );
}
