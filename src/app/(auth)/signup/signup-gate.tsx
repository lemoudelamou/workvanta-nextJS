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
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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
                            <span className="bg-[#F7F8FC] px-2 text-slate-400">
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
        </div>
    );
}