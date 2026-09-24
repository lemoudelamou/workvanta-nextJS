

import Link from "next/link";

import { getPasswordResetToken } from "@/lib/auth/reset-password";

import ResetPasswordForm from "./reset-password-form";

function ResetPasswordError({
    title,
    message,
}: {
    title: string;
    message: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
            <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/75 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">
                    {title}
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {message}
                </p>

                <Link
                    href="/password-forgotten"
                    className="mt-6 inline-flex text-sm font-semibold text-slate-900 underline underline-offset-4 dark:text-white"
                >
                    Request a new reset link
                </Link>
            </div>
        </main>
    );
}

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{
        token?: string;
    }>;
}) {
    const { token } = await searchParams;

    if (!token) {
        return (
            <ResetPasswordError
                title="Invalid reset link"
                message="This password reset link is missing its token."
            />
        );
    }

    const resetToken = await getPasswordResetToken(token);

    if (!resetToken) {
        return (
            <ResetPasswordError
                title="Reset link expired"
                message="This password reset link is invalid or has expired. Please request a new one."
            />
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
            <ResetPasswordForm token={token} />
        </main>
    );
}



