"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SignupForm from "./signup-form";
import SocialLoginButton from "@/components/ui/SocialLoginButton";

export default function SignupGate() {
    const [showForm, setShowForm] = useState(false);
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-3xl font-semibold tracking-tight text-[#101828]">
                    Create your account
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Start organizing your projects, tasks, and workspace in
                    one place.
                </p>
            </div>

            {error === "account_exists" && (
                <div className="mb-6 rounded-lg border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-danger">
                    An account with this email already exists. Please{" "}
                    <Link href="/signin" className="font-medium underline">
                        sign in
                    </Link>{" "}
                    instead.
                </div>
            )}

            {showForm ? (
                <SignupForm />
            ) : (
                <div className="space-y-4">
                    <SocialLoginButton provider="google" intent="signup" />
                    <SocialLoginButton provider="github" intent="signup" />

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-canvas px-2 text-slate-400">
                                or
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                        Create account
                    </button>
                </div>
            )}

            {/* Legal: on both steps, so Google and GitHub sign-ups see it too. */}
            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                By continuing, you agree to Workvanta&apos;s{" "}
                <Link
                    href="/terms"
                    className="font-medium text-slate-500 transition hover:text-slate-700 hover:underline"
                >
                    Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                    href="/privacy"
                    className="font-medium text-slate-500 transition hover:text-slate-700 hover:underline"
                >
                    Privacy Policy
                </Link>
                .
            </p>
        </div>
    );
}