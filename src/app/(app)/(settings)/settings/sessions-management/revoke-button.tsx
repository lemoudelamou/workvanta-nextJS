"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { revokeSession } from "@/app/(app)/(settings)/settings/sessions-management/actions";
import Modal from "@/components/ui/Modal";

interface RevokeSessionButtonProps {
    sessionId: string;
}

export default function RevokeButton({
    sessionId,
}: RevokeSessionButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [revoked, setRevoked] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleOpenModal() {
        setError(null);
        setIsModalOpen(true);
    }

    function handleCloseModal() {
        if (isPending) {
            return;
        }

        setIsModalOpen(false);
    }

    function handleRevoke() {
        setError(null);

        startTransition(async () => {
            try {
                await revokeSession(sessionId);

                setIsModalOpen(false);
                setRevoked(true);
            } catch (error) {
                console.error("Failed to revoke session:", error);

                setError(
                    "Unable to revoke this session. Please try again.",
                );
            }
        });
    }

    if (revoked) {
        return (
            <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08] dark:text-emerald-300">
                Revoked
            </span>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpenModal}
                disabled={isPending}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm font-semibold text-danger transition hover:border-danger/30 hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Trash2 className="size-4" />

                {isPending ? "Revoking..." : "Revoke"}
            </button>

            <Modal
                open={isModalOpen}
                title="Revoke session?"
                description="This will sign out this device. You can sign in again on the device if needed."
                confirmLabel="Revoke"
                cancelLabel="Cancel"
                loading={isPending}
                loadingLabel="Revoking..."
                error={error}
                onConfirm={handleRevoke}
                onClose={handleCloseModal}
            />
        </>
    );
}

