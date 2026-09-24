"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    ShieldCheck,
} from "lucide-react";
import { signup } from "./actions";

const fieldClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70";

const passwordFieldClass = `${fieldClass} pr-20`;

function PasswordInput({
    value,
    onChange,
    placeholder,
    disabled,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled: boolean;
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <input
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete={
                    placeholder.toLowerCase().includes("confirm")
                        ? "new-password"
                        : "new-password"
                }
                className={passwordFieldClass}
            />

            <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={disabled}
                aria-label={
                    showPassword ? "Hide password" : "Show password"
                }
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-50"
            >
                {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                ) : (
                    <Eye className="h-4 w-4" />
                )}
            </button>
        </div>
    );
}

function PasswordRequirements({
    password,
}: {
    password: string;
}) {
    const requirements = [
        {
            label: "8+ characters",
            valid: password.length >= 8,
        },
        {
            label: "Upper case & number",
            valid:
                /[A-Z]/.test(password) &&
                /[0-9]/.test(password),
        },
    ];

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
                <ShieldCheck
                    className="size-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                />

                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {requirements.map((requirement) => (
                        <div
                            key={requirement.label}
                            className="flex items-center gap-1.5"
                        >
                            <CheckCircle2
                                className={`size-3.5 ${requirement.valid
                                    ? "text-emerald-500"
                                    : "text-slate-300"
                                    }`}
                                aria-hidden="true"
                            />

                            <span className="text-xs text-slate-500">
                                {requirement.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SignupForm() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const passwordsMismatch =
        password.length > 0 &&
        confirmPassword.length > 0 &&
        password !== confirmPassword;

    const canSubmit =
        name.trim().length > 0 &&
        email.trim().length > 0 &&
        password.length > 0 &&
        confirmPassword.length > 0;

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");

        // Client-side validation
        if (!name.trim()) {
            setError("Enter your name.");
            return;
        }

        if (!email.trim()) {
            setError("Enter your email address.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("Enter a valid email address.");
            return;
        }

        if (!password) {
            setError("Create a password.");
            return;
        }

        if (password.length < 8) {
            setError(
                "Password must be at least 8 characters long.",
            );
            return;
        }

        if (!/[A-Z]/.test(password)) {
            setError(
                "Password must contain at least one uppercase letter.",
            );
            return;
        }

        if (!/[0-9]/.test(password)) {
            setError(
                "Password must contain at least one number.",
            );
            return;
        }

        if (password !== confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const result = await signup(
                name.trim(),
                email.trim().toLowerCase(),
                password,
                confirmPassword,
            );

            // Expected validation/application error.
            if (!result.success) {
                setError(result.error);
                setLoading(false);
                return;
            }

            // Account created successfully.
            router.push("/signin");
        } catch (error) {
            // Unexpected server/database error.
            console.error("SIGNUP ERROR:", error);

            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to create your account.",
            );

            setLoading(false);
        }
    }

    return (
        <div className="space-y-5">
            <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-5"
            >
                {/* Name */}
                <div className="space-y-2">
                    <label
                        htmlFor="name"
                        className="text-sm font-medium text-slate-700"
                    >
                        Full name
                    </label>

                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={name}
                        onChange={(event) =>
                            setName(event.target.value)
                        }
                        placeholder="Your name"
                        autoComplete="name"
                        disabled={loading}
                        className={fieldClass}
                    />
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label
                        htmlFor="email"
                        className="text-sm font-medium text-slate-700"
                    >
                        Email address
                    </label>

                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(event.target.value)
                        }
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={loading}
                        className={fieldClass}
                    />
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <label
                        htmlFor="password"
                        className="text-sm font-medium text-slate-700"
                    >
                        Password
                    </label>

                    <PasswordInput
                        value={password}
                        onChange={setPassword}
                        placeholder="Create a password"
                        disabled={loading}
                    />

                    <PasswordRequirements
                        password={password}
                    />
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                    <label
                        htmlFor="confirmPassword"
                        className="text-sm font-medium text-slate-700"
                    >
                        Confirm password
                    </label>

                    <PasswordInput
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Confirm your password"
                        disabled={loading}
                    />

                    {passwordsMismatch && (
                        <p className="text-xs text-red-600">
                            The passwords do not match.
                        </p>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-[#1D2939] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating account...
                        </>
                    ) : (
                        <>
                            Create account
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            </form>

            {/* Security message */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                <p className="text-xs leading-5 text-slate-500">
                    Your password is securely encrypted and your
                    account information is protected.
                </p>
            </div>

            {/* Legal */}
            <p className="pt-2 text-center text-xs leading-5 text-slate-400">
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