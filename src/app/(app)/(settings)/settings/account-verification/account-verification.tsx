"use client";

import { useActionState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Mail,
    RefreshCw,
} from "lucide-react";

import {
    resendEmailVerification,
    type EmailVerificationState,
} from "@/app/(app)/(settings)/settings/account-verification/actions";

const initialVerificationState: EmailVerificationState = {
    success: false,
    message: "",
};

type AccountVerificationProps = {
    email: string;
    verified: boolean;
};

export default function AccountVerification({
    email,
    verified,
}: AccountVerificationProps) {
    const [
        verificationState,
        resendVerification,
        isResendingVerification,
    ] = useActionState(
        resendEmailVerification,
        initialVerificationState,
    );

    if (verified) {
        return (
            <div className="p-5 sm:p-7">
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]">
                    <div className="flex items-start gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/[0.1] dark:text-emerald-300">
                            <CheckCircle2
                                className="size-5"
                                aria-hidden="true"
                            />
                        </div>

                        <div className="min-w-0">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08] dark:text-emerald-300">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Verified
                            </span>

                            <p className="mt-1 text-sm leading-6 text-emerald-800/70 dark:text-emerald-200/70">
                                Your email address{" "}
                                <span className="font-medium">
                                    {email}
                                </span>{" "}
                                has been verified.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 sm:p-7">
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/[0.1] dark:text-amber-300">
                            <Mail
                                className="size-5"
                                aria-hidden="true"
                            />
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                                    Email verification required
                                </p>

                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white/70 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/[0.08] dark:text-amber-300">
                                    <span className="size-1.5 rounded-full bg-amber-500" />
                                    Not verified
                                </span>
                            </div>

                            <p className="mt-1 break-all text-sm font-medium text-slate-700 dark:text-slate-300">
                                {email}
                            </p>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800/70 dark:text-amber-200/70">
                                Verify your email address to confirm
                                that you own it. If you did not
                                receive the original email, you can
                                send a new verification link below.
                            </p>
                        </div>
                    </div>

                    <form
                        action={resendVerification}
                        className="shrink-0"
                    >
                        <button
                            type="submit"
                            disabled={isResendingVerification}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-white/[0.16] dark:hover:bg-white/[0.08] sm:w-auto"
                        >
                            <RefreshCw
                                className={`size-4 ${
                                    isResendingVerification
                                        ? "animate-spin"
                                        : ""
                                }`}
                                aria-hidden="true"
                            />

                            {isResendingVerification
                                ? "Sending..."
                                : "Resend verification email"}
                        </button>
                    </form>
                </div>
            </div>

            {verificationState.message && (
                <div
                    role={
                        verificationState.success
                            ? "status"
                            : "alert"
                    }
                    className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${
                        verificationState.success
                            ? "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]"
                            : "border-red-200/80 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/[0.06]"
                    }`}
                >
                    {verificationState.success ? (
                        <CheckCircle2
                            className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300"
                            aria-hidden="true"
                        />
                    ) : (
                        <AlertTriangle
                            className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-300"
                            aria-hidden="true"
                        />
                    )}

                    <p
                        className={`text-sm leading-6 ${
                            verificationState.success
                                ? "text-emerald-800/80 dark:text-emerald-200/80"
                                : "text-red-800/80 dark:text-red-200/80"
                        }`}
                    >
                        {verificationState.message}
                    </p>
                </div>
            )}
        </div>
    );
}

