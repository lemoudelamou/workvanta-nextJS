"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

import { deleteAccount } from "./actions";

export default function DeleteAccountPage() {
    const [confirmation, setConfirmation] = useState("");
    const [isDeletingAccount, startDeletingAccount] =
        useTransition();
    const [errorMessage, setErrorMessage] = useState("");

    function handleDeleteAccount() {
        if (confirmation !== "DELETE") {
            setErrorMessage(
                'Type "DELETE" to confirm account deletion.',
            );
            return;
        }

        setErrorMessage("");

        startDeletingAccount(async () => {
            try {
                await deleteAccount();
            } catch (error) {
                console.error(error);

                setErrorMessage(
                    "Something went wrong while deleting your account. Please try again.",
                );
            }
        });
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-2xl">
                <Link
                    href="/settings"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                >
                    <ArrowLeft className="size-4" />
                    Back to Settings
                </Link>

                <div className="overflow-hidden rounded-2xl border border-red-200/80 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-red-500/20 dark:bg-white/[0.035] dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                    <div className="border-b border-red-200/70 bg-red-50/70 p-6 dark:border-red-500/10 dark:bg-red-500/[0.06] sm:p-7">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 dark:border-red-500/20 dark:bg-red-500/[0.08] dark:text-red-300">
                                <AlertTriangle className="size-5" />
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
                                    Danger Zone
                                </p>

                                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                                    Delete your account
                                </h1>

                                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    This permanently removes your
                                    Workvanta account and associated
                                    data. This action cannot be undone.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 p-6 sm:p-7">
                        <div className="rounded-xl border border-slate-200/80 bg-white/60 p-5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">
                                Before you continue
                            </h2>

                            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                <li>
                                    • Your account will be permanently
                                    deleted.
                                </li>
                                <li>
                                    • Your active sessions will be
                                    invalidated.
                                </li>
                                <li>
                                    • Associated account preferences
                                    will be removed.
                                </li>
                                <li>
                                    • You will be signed out immediately.
                                </li>
                            </ul>
                        </div>

                        <div>
                            <label
                                htmlFor="delete-confirmation"
                                className="text-sm font-semibold text-slate-950 dark:text-white"
                            >
                                Type{" "}
                                <span className="font-mono text-red-600 dark:text-red-400">
                                    DELETE
                                </span>{" "}
                                to confirm
                            </label>

                            <input
                                id="delete-confirmation"
                                type="text"
                                value={confirmation}
                                onChange={(event) => {
                                    setConfirmation(event.target.value);
                                    setErrorMessage("");
                                }}
                                disabled={isDeletingAccount}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="DELETE"
                                className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-red-500/40"
                            />
                        </div>

                        {errorMessage && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-500/20 dark:bg-red-500/[0.08] dark:text-red-300"
                            >
                                {errorMessage}
                            </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-white/[0.08]">
                            <Link
                                href="/settings"
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]"
                            >
                                Cancel
                            </Link>

                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-red-700 hover:bg-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:border-white/[0.08] dark:disabled:bg-white/[0.04] dark:disabled:text-slate-500"
                            >
                                <Trash2 className="size-4" />

                                {isDeletingAccount
                                    ? "Deleting account..."
                                    : "Delete account"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
