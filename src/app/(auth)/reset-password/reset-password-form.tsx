"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    CheckCircle2,
    LockKeyhole,
    ShieldCheck,
} from "lucide-react";

import {
    resetPassword,
    type ResetPasswordState,
} from "@/app/(auth)/reset-password/reset-password-actions";

const initialState: ResetPasswordState = {
    success: false,
    message: "",
};

const inputClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/[0.14] dark:focus:border-white/20 dark:focus:bg-white/[0.05] dark:focus:ring-white/[0.05]";

function Footer() {
    return (
        <p className="mt-5 text-center text-xs text-slate-400 dark:text-slate-600">
            © {new Date().getFullYear()} Workvanta
        </p>
    );
}

function SecurityNote({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                {children}
            </p>
        </div>
    );
}

function SuccessState({ message }: { message: string }) {
    return (
        <div className="w-full max-w-md">
            <div className="overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/90 p-8 text-center shadow-[0_20px_70px_-25px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-emerald-500/20 dark:bg-slate-950/80 dark:shadow-black/30">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                    <CheckCircle2
                        className="size-7"
                        strokeWidth={1.8}
                    />
                </div>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06] dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    All set
                </div>

                <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                    Password reset complete
                </h1>

                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {message}
                </p>

                <Link
                    href="/signin"
                    className="group mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/15 dark:bg-white dark:text-slate-950 dark:shadow-white/5 dark:hover:bg-slate-200"
                >
                    Continue to login
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>

                <div className="mt-7">
                    <SecurityNote>
                        Your password has been securely updated. You can now
                        sign in with your new credentials.
                    </SecurityNote>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default function ResetPasswordForm({
    token,
}: {
    token: string;
}) {
    const [state, formAction, pending] = useActionState(
        resetPassword,
        initialState,
    );

    if (state.success) {
        return <SuccessState message={state.message} />;
    }

    return (
        <div className="w-full max-w-md">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-[0_20px_70px_-25px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-950/80 dark:shadow-black/30 sm:p-8">
                <div className="mb-8">
                    <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950">
                        <LockKeyhole
                            className="size-5"
                            strokeWidth={2}
                        />
                    </div>

                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Account recovery
                    </div>

                    <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                        Create a new password
                    </h1>

                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Choose a strong new password to secure your Workvanta
                        account.
                    </p>
                </div>

                <form action={formAction} className="space-y-5">
                    <input type="hidden" name="token" value={token} />

                    <PasswordField
                        id="password"
                        label="New password"
                        placeholder="Enter your new password"
                    />

                    <PasswordField
                        id="confirmPassword"
                        label="Confirm new password"
                        placeholder="Re-enter your new password"
                    />

                    {state.message && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3.5 text-sm leading-5 text-red-800 dark:border-red-500/20 dark:bg-red-500/[0.06] dark:text-red-300"
                        >
                            <div className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />
                            <p>{state.message}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={pending}
                        className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/15 active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:shadow-white/5 dark:hover:bg-slate-200"
                    >
                        <span className="relative z-10">
                            {pending
                                ? "Resetting password..."
                                : "Reset password"}
                        </span>

                        {!pending && (
                            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full dark:via-black/5" />
                        )}
                    </button>
                </form>

                <div className="mt-7">
                    <SecurityNote>
                        Your new password will be securely encrypted and used
                        to protect your account.
                    </SecurityNote>
                </div>
            </div>

            <Footer />
        </div>
    );
}

function PasswordField({
    id,
    label,
    placeholder,
}: {
    id: string;
    label: string;
    placeholder: string;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
            >
                {label}
            </label>

            <input
                id={id}
                name={id}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder={placeholder}
                className={inputClassName}
            />

            {id === "password" && (
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    Use at least 8 characters.
                </p>
            )}
        </div>
    );
}
