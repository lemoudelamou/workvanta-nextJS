"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";

import { buttonStyles } from "@/app/style/button-style";

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
                    "Couldn't sign out that device. Please try again.",
                );
            }
        });
    }

    if (revoked) {
        return (
            <span role="status" className="shrink-0 text-sm font-medium text-muted-foreground">
                Signed out
            </span>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpenModal}
                disabled={isPending}
                className={`${buttonStyles({ variant: "secondary", size: "sm" })} shrink-0`}
            >
                <LogOut className="size-3.5" aria-hidden="true" />

                {isPending ? "Signing out…" : "Sign out"}
            </button>

            <Modal
                open={isModalOpen}
                title="Sign out this device?"
                description="Whoever is using it will need to sign in again."
                confirmLabel="Sign out device"
                cancelLabel="Cancel"
                loading={isPending}
                loadingLabel="Signing out…"
                error={error}
                onConfirm={handleRevoke}
                onClose={handleCloseModal}
            />
        </>
    );
}

