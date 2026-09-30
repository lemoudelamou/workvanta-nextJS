"use client";

import { useEffect, useState, type FormEvent } from "react";
import { setPassword } from "@/app/(app)/(settings)/settings/connect-account/actions";
import GitHubIcon from "@/app/style/githubIcon";
import GoogleIcon from "@/app/style/googleIcon";
import { CheckCircle2, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
    connectedBadgeClass,
    secondaryButtonClass,
    primaryButtonClass,
    inputClass,
    labelClass,
    cardClass,
} from "@/app/style/ui-tokens";

type Provider = "github" | "google";

type Account = {
    provider: Provider;
};

type Props = {
    accounts: Account[];
    hasPassword: boolean;
};

const providers: {
    id: Provider;
    name: string;
    description: string;
}[] = [
    {
        id: "github",
        name: "GitHub",
        description: "Connect your GitHub account",
    },
    {
        id: "google",
        name: "Google",
        description: "Connect your Google account",
    },
];

export default function ConnectAccount({
    accounts,
    hasPassword,
}: Props) {
    const [connectingProvider, setConnectingProvider] =
        useState<Provider | null>(null);

    const [disconnectingProvider, setDisconnectingProvider] =
        useState<Provider | null>(null);

    const [providerToDisconnect, setProviderToDisconnect] =
        useState<Provider | null>(null);

    const [disconnectErrorMessage, setDisconnectErrorMessage] =
        useState<string | null>(null);

    const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] =
        useState<string | null>(null);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const hasMinimumPasswordLength = newPassword.length >= 8;
    const hasUppercaseLetter = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    const passwordsMatch =
        newPassword.length > 0 &&
        confirmPassword.length > 0 &&
        newPassword === confirmPassword;

    const isPasswordValid =
        hasMinimumPasswordLength &&
        hasUppercaseLetter &&
        hasNumber &&
        passwordsMatch &&
        (!hasPassword || currentPassword.length > 0);

    function isProviderConnected(provider: Provider) {
        return accounts.some((account) => account.provider === provider);
    }

    function resetPasswordForm() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordErrorMessage(null);
    }

    function handleConnect(provider: Provider) {
        setConnectingProvider(provider);

        // Starts the OAuth flow and links the provider to the signed-in user.
        window.location.assign(`/api/oauth/${provider}?intent=link`);
    }

    function openDisconnectModal(provider: Provider) {
        setDisconnectErrorMessage(null);
        setProviderToDisconnect(provider);
    }

    function closeDisconnectModal() {
        if (disconnectingProvider !== null) {
            return;
        }

        setProviderToDisconnect(null);
        setDisconnectErrorMessage(null);
    }

    async function handleDisconnect() {
        if (!providerToDisconnect) {
            return;
        }

        const provider = providerToDisconnect;

        setDisconnectingProvider(provider);
        setDisconnectErrorMessage(null);

        try {
            const response = await fetch(`/api/oauth/${provider}`, {
                method: "DELETE",
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.error ?? "Failed to disconnect account.",
                );
            }

            window.location.reload();
        } catch (error) {
            console.error(error);

            setDisconnectErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Failed to disconnect account.",
            );

            setDisconnectingProvider(null);
        }
    }

    useEffect(() => {
        if (!providerToDisconnect) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                closeDisconnectModal();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [providerToDisconnect, disconnectingProvider]);

    async function handleSetPassword(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setPasswordErrorMessage(null);

        if (hasPassword && !currentPassword) {
            setPasswordErrorMessage("Enter your current password.");
            return;
        }

        if (!hasMinimumPasswordLength) {
            setPasswordErrorMessage(
                "Password must be at least 8 characters long.",
            );
            return;
        }

        if (!hasUppercaseLetter) {
            setPasswordErrorMessage(
                "Password must contain at least one uppercase letter.",
            );
            return;
        }

        if (!hasNumber) {
            setPasswordErrorMessage(
                "Password must contain at least one number.",
            );
            return;
        }

        if (!passwordsMatch) {
            setPasswordErrorMessage("The passwords do not match.");
            return;
        }

        setIsSavingPassword(true);

        try {
            const result = await setPassword(
                currentPassword,
                newPassword,
                confirmPassword,
            );

            if (!result.success) {
                setPasswordErrorMessage(result.error);
                return;
            }

            resetPasswordForm();
            setIsPasswordFormOpen(false);

            window.location.reload();
        } catch (error) {
            console.error(error);

            setPasswordErrorMessage(
                "Something went wrong. Please try again.",
            );
        } finally {
            setIsSavingPassword(false);
        }
    }

    const passwordRequirements = [
        {
            label: "8+ characters",
            met: hasMinimumPasswordLength,
        },
        {
            label: "Uppercase letter",
            met: hasUppercaseLetter,
        },
        {
            label: "Number",
            met: hasNumber,
        },
        {
            label: "Passwords match",
            met: passwordsMatch,
        },
    ];

    const providerToDisconnectDetails = providerToDisconnect
        ? providers.find(
              (provider) => provider.id === providerToDisconnect,
          )
        : null;

    return (
        <>
            <div className="space-y-3">
                {/* Password */}
                <div className={cardClass}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.04]">
                                <KeyRound className="size-5 text-slate-950 dark:text-white" />
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                        Password
                                    </p>

                                    {hasPassword && (
                                        <span className={connectedBadgeClass}>
                                            <span className="size-1.5 rounded-full bg-emerald-500" />
                                            Set
                                        </span>
                                    )}
                                </div>

                                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    {hasPassword
                                        ? "Your account has a password and can be accessed with email and password."
                                        : "Set a password so you can sign in without using GitHub or Google."}
                                </p>
                            </div>
                        </div>

                        {!isPasswordFormOpen && (
                            <button
                                type="button"
                                onClick={() => {
                                    resetPasswordForm();
                                    setIsPasswordFormOpen(true);
                                }}
                                className={primaryButtonClass}
                            >
                                {hasPassword
                                    ? "Change password"
                                    : "Set password"}
                            </button>
                        )}
                    </div>

                    {isPasswordFormOpen && (
                        <form
                            onSubmit={handleSetPassword}
                            className="mt-5 space-y-4 border-t border-slate-200 pt-5 dark:border-white/[0.08]"
                        >
                            {/* Current password */}
                            {hasPassword && (
                                <div>
                                    <label
                                        htmlFor="current-password"
                                        className={labelClass}
                                    >
                                        Current password
                                    </label>

                                    <div className="relative">
                                        <input
                                            id="current-password"
                                            type={
                                                showCurrentPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            autoComplete="current-password"
                                            value={currentPassword}
                                            onChange={(event) => {
                                                setCurrentPassword(
                                                    event.target.value,
                                                );
                                                setPasswordErrorMessage(null);
                                            }}
                                            disabled={isSavingPassword}
                                            className={`${inputClass} pr-10`}
                                            placeholder="Your current password"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowCurrentPassword(
                                                    (value) => !value,
                                                )
                                            }
                                            disabled={isSavingPassword}
                                            aria-label={
                                                showCurrentPassword
                                                    ? "Hide current password"
                                                    : "Show current password"
                                            }
                                            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:text-slate-300"
                                        >
                                            {showCurrentPassword ? (
                                                <EyeOff className="size-4" />
                                            ) : (
                                                <Eye className="size-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* New password */}
                            <div>
                                <label
                                    htmlFor="new-password"
                                    className={labelClass}
                                >
                                    New password
                                </label>

                                <div className="relative">
                                    <input
                                        id="new-password"
                                        type={
                                            showNewPassword
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(event) => {
                                            setNewPassword(event.target.value);
                                            setPasswordErrorMessage(null);
                                        }}
                                        disabled={isSavingPassword}
                                        className={`${inputClass} pr-10`}
                                        placeholder="Create a strong password"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowNewPassword(
                                                (value) => !value,
                                            )
                                        }
                                        disabled={isSavingPassword}
                                        aria-label={
                                            showNewPassword
                                                ? "Hide new password"
                                                : "Show new password"
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:text-slate-300"
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="size-4" />
                                        ) : (
                                            <Eye className="size-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Password requirements */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
                                <ShieldCheck className="size-4 shrink-0 text-slate-500 dark:text-slate-400" />

                                {passwordRequirements.map(
                                    ({ label, met }) => (
                                        <div
                                            key={label}
                                            className={`flex items-center gap-2 transition-colors duration-200 ${
                                                met
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-slate-500 dark:text-slate-400"
                                            }`}
                                        >
                                            <CheckCircle2
                                                className={`size-4 shrink-0 transition-colors duration-200 ${
                                                    met
                                                        ? "text-emerald-500"
                                                        : "text-slate-300 dark:text-slate-600"
                                                }`}
                                            />

                                            <span>{label}</span>
                                        </div>
                                    ),
                                )}
                            </div>

                            {/* Confirm password */}
                            <div>
                                <label
                                    htmlFor="confirm-password"
                                    className={labelClass}
                                >
                                    Confirm password
                                </label>

                                <div className="relative">
                                    <input
                                        id="confirm-password"
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(event) => {
                                            setConfirmPassword(
                                                event.target.value,
                                            );
                                            setPasswordErrorMessage(null);
                                        }}
                                        disabled={isSavingPassword}
                                        className={`${inputClass} pr-10`}
                                        placeholder="Repeat your password"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                (value) => !value,
                                            )
                                        }
                                        disabled={isSavingPassword}
                                        aria-label={
                                            showConfirmPassword
                                                ? "Hide confirm password"
                                                : "Show confirm password"
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:text-slate-300"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="size-4" />
                                        ) : (
                                            <Eye className="size-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error */}
                            {passwordErrorMessage && (
                                <p
                                    role="alert"
                                    className="text-sm text-red-600 dark:text-red-400"
                                >
                                    {passwordErrorMessage}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={isSavingPassword}
                                    onClick={() => {
                                        setIsPasswordFormOpen(false);
                                        resetPasswordForm();
                                    }}
                                    className={secondaryButtonClass}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        isSavingPassword || !isPasswordValid
                                    }
                                    className={primaryButtonClass}
                                >
                                    {isSavingPassword
                                        ? "Saving..."
                                        : hasPassword
                                          ? "Change password"
                                          : "Set password"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* OAuth providers */}
                {providers.map((provider) => {
                    const isConnected = isProviderConnected(provider.id);

                    return (
                        <div
                            key={provider.id}
                            className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${cardClass}`}
                        >
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.04]">
                                    {provider.id === "github" ? (
                                        <GitHubIcon className="size-5" />
                                    ) : (
                                        <GoogleIcon className="size-5" />
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                            {provider.name}
                                        </p>

                                        {isConnected && (
                                            <span
                                                className={
                                                    connectedBadgeClass
                                                }
                                            >
                                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                                Connected
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                        {isConnected
                                            ? `Your ${provider.name} account is connected.`
                                            : provider.description}
                                    </p>
                                </div>
                            </div>

                            {isConnected ? (
                                <button
                                    type="button"
                                    disabled={disconnectingProvider !== null}
                                    onClick={() =>
                                        openDisconnectModal(provider.id)
                                    }
                                    className={secondaryButtonClass}
                                >
                                    {disconnectingProvider === provider.id
                                        ? "Disconnecting..."
                                        : "Disconnect"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={connectingProvider !== null}
                                    onClick={() =>
                                        handleConnect(provider.id)
                                    }
                                    className={primaryButtonClass}
                                >
                                    {connectingProvider === provider.id
                                        ? "Connecting..."
                                        : "Connect"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {providerToDisconnect &&
                providerToDisconnectDetails && (
                    <Modal
                        open={providerToDisconnect !== null}
                        title={`Disconnect ${providerToDisconnectDetails.name}?`}
                        description={
                            <>
                                This will remove the connection to your{" "}
                                {providerToDisconnectDetails.name} account. You
                                can reconnect it later from your account
                                settings.
                            </>
                        }
                        confirmLabel="Disconnect account"
                        loadingLabel="Disconnecting..."
                        loading={disconnectingProvider !== null}
                        error={disconnectErrorMessage}
                        onClose={closeDisconnectModal}
                        onConfirm={handleDisconnect}
                    />
                )}
        </>
    );
}

