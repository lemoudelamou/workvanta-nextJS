"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Check,
    Copy,
    KeyRound,
    ShieldCheck,
    ShieldOff,
} from "lucide-react";

import {
    beginTwoFactorSetup,
    confirmTwoFactorSetup,
    disableTwoFactor,
    regenerateBackupCodes,
} from "@/app/(app)/(settings)/settings/two-factor-authentication/actions";

const panelClass =
    "rounded-xl border border-slate-200/80 bg-white/60 p-5 dark:border-white/[0.08] dark:bg-white/[0.03]";

const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200";

const secondaryButtonClass =
    "inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]";

const inputClass =
    "block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/[0.06]";

const codeBoxClass =
    "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-semibold tracking-[0.12em] text-slate-800 dark:border-white/[0.08] dark:bg-black/20 dark:text-slate-200";

export default function TwoFactorSettings({
    initialEnabled,
    initialBackupCodes,
}: {
    initialEnabled: boolean;
    initialBackupCodes: number;
}) {
    const router = useRouter();

    const [enabled, setEnabled] = useState(initialEnabled);
    const [backupCount, setBackupCount] = useState(initialBackupCodes);

    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [code, setCode] = useState("");

    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);

    const [confirmingDisable, setConfirmingDisable] = useState(false);
    const [disableCode, setDisableCode] = useState("");

    const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
    const [regenerateCode, setRegenerateCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /* -------------------------------------------------------------- */
    /* Enable                                                          */
    /* -------------------------------------------------------------- */

    async function startSetup() {
        setLoading(true);
        setError("");

        try {
            const result = await beginTwoFactorSetup();

            if (!result.success) {
                setError(result.error);
                return;
            }

            setQrCode(result.qrCode);
            setSecret(result.secret);
        } catch {
            setError("Could not start 2FA setup.");
        } finally {
            setLoading(false);
        }
    }

    function cancelSetup() {
        setQrCode("");
        setSecret("");
        setCode("");
        setError("");
    }

    async function confirmSetup() {
        if (code.length !== 6) {
            setError("Enter the 6-digit authenticator code.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await confirmTwoFactorSetup(code);

            if (!result.success) {
                setError(result.error);
                return;
            }

            setEnabled(true);
            setBackupCodes(result.backupCodes);
            setBackupCount(result.backupCodes.length);

            setQrCode("");
            setSecret("");
            setCode("");

            router.refresh();
        } catch {
            setError("Could not enable 2FA.");
        } finally {
            setLoading(false);
        }
    }

    /* -------------------------------------------------------------- */
    /* Disable — requires a live authenticator code (not a backup code) */
    /* -------------------------------------------------------------- */

    function openDisableConfirm() {
        setDisableCode("");
        setError("");
        setConfirmingDisable(true);
    }

    function closeDisableConfirm() {
        setDisableCode("");
        setConfirmingDisable(false);
    }

    async function disable() {
        if (disableCode.length !== 6) {
            setError("Enter the 6-digit code from your authenticator app.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await disableTwoFactor(disableCode);

            if (!result.success) {
                setError(result.error);
                return;
            }

            setEnabled(false);
            setBackupCount(0);
            setBackupCodes([]);
            setConfirmingDisable(false);
            setDisableCode("");

            // Re-run the Server Component so the page reflects the new state
            router.refresh();
        } catch {
            setError("Could not disable 2FA.");
        } finally {
            setLoading(false);
        }
    }

    /* -------------------------------------------------------------- */
    /* Backup codes — TOTP or an existing backup code both work here   */
    /* -------------------------------------------------------------- */

    function openRegenerateConfirm() {
        setRegenerateCode("");
        setError("");
        setConfirmingRegenerate(true);
    }

    function closeRegenerateConfirm() {
        setRegenerateCode("");
        setConfirmingRegenerate(false);
    }

    async function regenerate() {
        if (!regenerateCode.trim()) {
            setError("Enter your authenticator code or a backup code.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await regenerateBackupCodes(regenerateCode);

            if (!result.success) {
                setError(result.error);
                return;
            }

            setBackupCodes(result.backupCodes);
            setBackupCount(result.backupCodes.length);
            setCopied(false);
            setConfirmingRegenerate(false);
            setRegenerateCode("");

            router.refresh();
        } catch {
            setError("Could not regenerate backup codes.");
        } finally {
            setLoading(false);
        }
    }

    async function copyCodes() {
        if (backupCodes.length === 0) {
            return;
        }

        try {
            await navigator.clipboard.writeText(backupCodes.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("Could not copy backup codes.");
        }
    }

    return (
        <div className="px-5 py-6 sm:px-7 sm:py-7">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
                        {enabled ? (
                            <ShieldCheck className="size-5" aria-hidden="true" />
                        ) : (
                            <ShieldOff className="size-5" aria-hidden="true" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                                Two-factor authentication
                            </h3>

                            <span
                                className={[
                                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                    enabled
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                                        : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400",
                                ].join(" ")}
                            >
                                {enabled ? "Enabled" : "Not enabled"}
                            </span>
                        </div>

                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Add an authenticator app to protect your account
                            with an additional verification step.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
                >
                    {error}
                </div>
            )}

            {!enabled ? (
                <div className="mt-6">
                    {!qrCode ? (
                        <div className={panelClass}>
                            <div className="flex items-start gap-3">
                                <KeyRound
                                    className="mt-0.5 size-5 shrink-0 text-slate-500 dark:text-slate-400"
                                    aria-hidden="true"
                                />

                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Protect your account
                                    </h4>

                                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                        Use an authenticator app such as Google
                                        Authenticator, Authy, 1Password, or
                                        another TOTP-compatible app.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={startSetup}
                                disabled={loading}
                                className={`mt-5 ${primaryButtonClass}`}
                            >
                                {loading
                                    ? "Starting..."
                                    : "Enable two-factor authentication"}
                            </button>
                        </div>
                    ) : (
                        <div className={panelClass}>
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Scan the QR code
                                </h4>

                                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    Open your authenticator app and scan this QR
                                    code.
                                </p>
                            </div>

                            <div className="mt-5 flex justify-center">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/[0.08]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={qrCode}
                                        alt="Two-factor authentication QR code"
                                        className="size-52"
                                    />
                                </div>
                            </div>

                            {secret && (
                                <div className="mt-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        Manual setup key
                                    </p>

                                    <code className="mt-2 block overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold tracking-[0.12em] text-slate-800 dark:border-white/[0.08] dark:bg-black/20 dark:text-slate-200">
                                        {secret}
                                    </code>
                                </div>
                            )}

                            <div className="mt-6">
                                <label
                                    htmlFor="two-factor-code"
                                    className="block text-sm font-semibold text-slate-900 dark:text-white"
                                >
                                    Verification code
                                </label>

                                <input
                                    id="two-factor-code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={code}
                                    onChange={(event) =>
                                        setCode(
                                            event.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 6),
                                        )
                                    }
                                    placeholder="000000"
                                    className={`mt-2 tracking-[0.2em] ${inputClass}`}
                                />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={confirmSetup}
                                    disabled={loading || code.length !== 6}
                                    className={primaryButtonClass}
                                >
                                    {loading ? "Verifying..." : "Activate 2FA"}
                                </button>

                                <button
                                    type="button"
                                    onClick={cancelSetup}
                                    disabled={loading}
                                    className={secondaryButtonClass}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-6 space-y-4">
                    {/* Backup codes */}
                    <div className={panelClass}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Backup codes
                                </h4>

                                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                    {backupCount} unused backup{" "}
                                    {backupCount === 1
                                        ? "code remains"
                                        : "codes remain"}
                                    .
                                </p>
                            </div>

                            {!confirmingRegenerate && (
                                <button
                                    type="button"
                                    onClick={openRegenerateConfirm}
                                    disabled={loading}
                                    className={secondaryButtonClass}
                                >
                                    Regenerate codes
                                </button>
                            )}
                        </div>

                        {confirmingRegenerate && (
                            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-white/[0.08]">
                                <label
                                    htmlFor="regenerate-code"
                                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                                >
                                    Enter a code to confirm
                                </label>

                                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    Your authenticator code or one of your
                                    current backup codes.
                                </p>

                                <input
                                    id="regenerate-code"
                                    type="text"
                                    inputMode="text"
                                    autoComplete="one-time-code"
                                    autoCapitalize="characters"
                                    autoFocus
                                    value={regenerateCode}
                                    onChange={(event) =>
                                        setRegenerateCode(
                                            event.target.value.trim(),
                                        )
                                    }
                                    placeholder="Authenticator or backup code"
                                    className={inputClass}
                                />

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={regenerate}
                                        disabled={
                                            loading || !regenerateCode.trim()
                                        }
                                        className={primaryButtonClass}
                                    >
                                        {loading
                                            ? "Generating..."
                                            : "Confirm regenerate"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={closeRegenerateConfirm}
                                        disabled={loading}
                                        className={secondaryButtonClass}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {backupCodes.length > 0 && (
                            <div className="mt-5">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        New backup codes
                                    </p>

                                    <button
                                        type="button"
                                        onClick={copyCodes}
                                        className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                                    >
                                        {copied ? (
                                            <Check
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Copy
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        )}
                                        {copied ? "Copied" : "Copy"}
                                    </button>
                                </div>

                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {backupCodes.map((backupCode) => (
                                        <code
                                            key={backupCode}
                                            className={codeBoxClass}
                                        >
                                            {backupCode}
                                        </code>
                                    ))}
                                </div>

                                <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    <Check
                                        className="mt-0.5 size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <p>
                                        Save these codes somewhere secure. They
                                        are shown only once and can be used if
                                        you lose access to your authenticator
                                        app.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Disable 2FA */}
                    <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-5 dark:border-red-400/15 dark:bg-red-400/[0.04]">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            Disable two-factor authentication
                        </h4>

                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Your account will be protected by your password
                            only, and your other devices will be signed out.
                            Backup codes can&apos;t be used for this — you need
                            a live code from your authenticator app.
                        </p>

                        {!confirmingDisable ? (
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={openDisableConfirm}
                                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300 dark:hover:bg-red-400/10"
                                >
                                    Disable 2FA
                                </button>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-3">
                                <label
                                    htmlFor="disable-code"
                                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                                >
                                    Enter your authenticator code to confirm
                                </label>

                                <input
                                    id="disable-code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    autoFocus
                                    value={disableCode}
                                    onChange={(event) =>
                                        setDisableCode(
                                            event.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 6),
                                        )
                                    }
                                    placeholder="000000"
                                    className={`tracking-[0.2em] ${inputClass}`}
                                />

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={disable}
                                        disabled={
                                            loading || disableCode.length !== 6
                                        }
                                        className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {loading
                                            ? "Disabling..."
                                            : "Yes, disable it"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={closeDisableConfirm}
                                        disabled={loading}
                                        className={secondaryButtonClass}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}