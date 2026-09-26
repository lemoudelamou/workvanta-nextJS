"use client";

import { useState } from "react";
import GithubIcon from "@/app/style/githubIcon";
import GoogleIcon from "@/app/style/googleIcon";

type Props = {
    provider: "google" | "github" | "apple";
    intent?: "login" | "signup";
};

const labels = {
    google: "Google",
    github: "GitHub",
    apple: "Apple",
} as const;

export default function SocialLoginButton({
    provider,
    intent = "login",
}: Props) {
    const [loading, setLoading] = useState(false);

    return (
        <a
            href={`/api/oauth/${provider}?intent=${intent}`}
            aria-disabled={loading}
            onClick={(e) => {
                if (loading) {
                    e.preventDefault();
                    return;
                }

                setLoading(true);
            }}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${loading ? "cursor-wait opacity-70" : ""
                }`}
        >
            {loading ? (
                <>
                    <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
                        aria-hidden="true"
                    />
                    <span>Connecting to {labels[provider]}...</span>
                </>
            ) : (
                <>
                    {provider === "google" && <GoogleIcon />}
                    {provider === "github" && <GithubIcon />}
                    <span>{labels[provider]}</span>
                </>
            )}
        </a>
    );
}
