"use client";

import { useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";

type ModalProps = {
    open: boolean;
    title: string;
    description: React.ReactNode;

    confirmLabel?: string;
    cancelLabel?: string;

    loading?: boolean;
    loadingLabel?: string;
    error?: string | null;

    onConfirm: () => void | Promise<void>;
    onClose: () => void;
};

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    loading = false,
    loadingLabel = "Working...",
    error = null,
    onConfirm,
    onClose,
}: ModalProps) {
    const titleId = useId();
    const descriptionId = useId();

    const modalRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    const closeRef = useRef(onClose);
    const isLoadingRef = useRef(loading);

    closeRef.current = onClose;
    isLoadingRef.current = loading;

    useEffect(() => {
        if (!open) {
            return;
        }

        const previouslyFocused =
            document.activeElement as HTMLElement | null;

        const previousBodyOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => {
            cancelButtonRef.current?.focus();
        }, 0);

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !isLoadingRef.current) {
                event.preventDefault();
                closeRef.current();
                return;
            }

            if (event.key !== "Tab" || !modalRef.current) {
                return;
            }

            const focusableElements =
                modalRef.current.querySelectorAll<HTMLElement>(
                    FOCUSABLE_SELECTOR,
                );

            if (!focusableElements.length) {
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement =
                focusableElements[focusableElements.length - 1];

            if (
                event.shiftKey &&
                document.activeElement === firstElement
            ) {
                event.preventDefault();
                lastElement.focus();
                return;
            }

            if (
                !event.shiftKey &&
                document.activeElement === lastElement
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener("keydown", handleKeyDown);

            document.body.style.overflow = previousBodyOverflow;

            previouslyFocused?.focus();
        };
    }, [open]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                aria-hidden="true"
                onMouseDown={() => {
                    if (!loading) {
                        onClose();
                    }
                }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm motion-safe:animate-[cm-fade_150ms_ease-out]"
            />

            <div
                ref={modalRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="
                    relative w-full max-w-[320px] overflow-hidden
                    rounded-[20px]
                    bg-white/95 text-neutral-900
                    shadow-2xl shadow-black/30
                    backdrop-blur-xl
                    motion-safe:animate-[cm-pop_200ms_cubic-bezier(0.2,0.9,0.3,1.15)]
                    dark:bg-neutral-800/95 dark:text-neutral-50
                "
            >
                <div className="px-6 pb-5 pt-6 text-center">
                    <h2
                        id={titleId}
                        className="text-[17px] font-semibold leading-snug tracking-tight"
                    >
                        {title}
                    </h2>

                    <div
                        id={descriptionId}
                        className="mt-1.5 text-[13.5px] leading-[1.5] text-neutral-500 dark:text-neutral-400"
                    >
                        {description}
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="mt-3 text-[13px] font-medium leading-5 text-red-600 dark:text-red-400"
                        >
                            {error}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 border-t border-neutral-200 dark:border-white/10">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        disabled={loading}
                        onClick={onClose}
                        className="
                            h-12 border-r border-neutral-200
                            text-[15px] font-medium text-neutral-800
                            transition-colors
                            hover:bg-neutral-100 active:bg-neutral-200
                            focus-visible:outline-none focus-visible:bg-neutral-100
                            disabled:pointer-events-none disabled:opacity-40
                            dark:border-white/10 dark:text-neutral-200
                            dark:hover:bg-white/5 dark:active:bg-white/10
                            dark:focus-visible:bg-white/5
                        "
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        disabled={loading}
                        onClick={onConfirm}
                        className="
                            inline-flex h-12 items-center justify-center gap-2
                            text-[15px] font-semibold text-red-600
                            transition-colors
                            hover:bg-red-50 active:bg-red-100
                            focus-visible:outline-none focus-visible:bg-red-50
                            disabled:pointer-events-none disabled:opacity-60
                            dark:text-red-400
                            dark:hover:bg-red-400/10 dark:active:bg-red-400/15
                            dark:focus-visible:bg-red-400/10
                        "
                    >
                        {loading && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}

                        {loading ? loadingLabel : confirmLabel}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes cm-fade {
                    from {
                        opacity: 0;
                    }

                    to {
                        opacity: 1;
                    }
                }

                @keyframes cm-pop {
                    from {
                        opacity: 0;
                        transform: scale(0.94);
                    }

                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
        </div>
    );
}

