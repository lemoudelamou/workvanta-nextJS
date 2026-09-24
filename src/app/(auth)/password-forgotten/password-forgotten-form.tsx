"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Mail,
    ShieldCheck,
} from "lucide-react";

import {
    forgotPassword,
    type ForgotPasswordState,
} from "@/app/(auth)/password-forgotten/password-forgotten-actions";

const initialState: ForgotPasswordState = {
    success: false,
    message: "",
};

export default function ForgotPasswordForm() {
    const [state, formAction, pending] = useActionState(
        forgotPassword,
        initialState,
    );

    return (
        <div className="w-full max-w-md">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-[0_20px_70px_-25px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-950/80 dark:shadow-black/30 sm:p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950">
                        <ShieldCheck
                            className="size-5"
                            strokeWidth={2}
                        />
                    </div>

                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Account recovery
                    </div>

                    <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                        Forgot your password?
                    </h1>

                    <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Enter the email address associated with your
                        Workvanta account and we&apos;ll send you a secure
                        password reset link.
                    </p>
                </div>

                {/* Form */}
                <form
                    action={formAction}
                    className="space-y-5"
                >
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200"
                        >
                            Email address
                        </label>

                        <div className="relative">
                            <Mail
                                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                                strokeWidth={2}
                            />

                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="you@example.com"
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-slate-500 dark:hover:border-white/[0.14] dark:focus:border-white/20 dark:focus:bg-white/[0.05] dark:focus:ring-white/[0.05]"
                            />
                        </div>
                    </div>

                    {/* Feedback */}
                    {state.message && (
                        <div
                            role={state.success ? "status" : "alert"}
                            className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-5 ${
                                state.success
                                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06] dark:text-emerald-300"
                                    : "border-red-200 bg-red-50/80 text-red-800 dark:border-red-500/20 dark:bg-red-500/[0.06] dark:text-red-300"
                            }`}
                        >
                            <span
                                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                                    state.success
                                        ? "bg-emerald-500"
                                        : "bg-red-500"
                                }`}
                            />

                            <p>{state.message}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={pending}
                        className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-950/15 active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:shadow-white/5 dark:hover:bg-slate-200"
                    >
                        <span className="relative z-10">
                            {pending
                                ? "Sending reset link..."
                                : "Send reset link"}
                        </span>

                        {!pending && (
                            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full dark:via-black/5" />
                        )}
                    </button>
                </form>

                {/* Security note */}
                <div className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-500 dark:text-slate-400" />

                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        For your security, we&apos;ll only send a reset link
                        if this email is associated with an account.
                    </p>
                </div>

                {/* Back to login */}
                <Link
                    href="/login"
                    className="group mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                >
                    <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                    Back to login
                </Link>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400 dark:text-slate-600">
                © {new Date().getFullYear()} Workvanta
            </p>
        </div>
    );
}
