"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  loginWithPassword,
  verifyLoginTwoFactor,
  verifyLoginBackupCode,
} from "@/app/signin/actions";
import SocialLoginButton from "@/components/ui/SocialLoginButton"

export default function CredentialsLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const searchParams = useSearchParams();

  const [requiresTwoFactor, setRequiresTwoFactor] =
    useState(false);

  const [twoFactorCode, setTwoFactorCode] = useState("");

  const [useBackupCode, setUseBackupCode] = useState(false);

  const [rememberDevice, setRememberDevice] =
    useState(false);


  /* ------------------------------------------------------------------ */
  /* OAUTH ERROR                                                        */
  /* ------------------------------------------------------------------ */


  const oauthError = searchParams.get("error");

  const oauthErrorMessages: Record<string, string> = {
    OAuthAccountNotLinked:
      "An account with this email already exists. Sign in with your existing method first, then connect this provider from your account settings.",

    AccessDenied:
      "Sign in was cancelled.",

    Configuration:
      "There is a problem with the authentication configuration.",

    OAuthSignin:
      "Unable to start the social sign-in process.",

    OAuthCallback:
      "Unable to complete the social sign-in process.",
  };

  const oauthErrorMessage = oauthError
    ? oauthErrorMessages[oauthError] ??
    "Unable to sign in. Please try again."
    : "";


  /* ------------------------------------------------------------------ */
  /* CREDENTIALS LOGIN                                                  */
  /* ------------------------------------------------------------------ */


  async function handleCredentialsLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await loginWithPassword(email.trim(), password);

      console.log("LOGIN RESULT:", result);

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setIsLoading(false);
        return;
      }

      window.location.href = "/signin";
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Invalid email or password.",
      );

      setIsLoading(false);
    }
  }


  /* ------------------------------------------------------------------ */
  /* TWO-FACTOR LOGIN                                                   */
  /* ------------------------------------------------------------------ */

  async function handleTwoFactorLogin(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const code = twoFactorCode.trim();

    if (!code) {
      setError(
        useBackupCode
          ? "Enter your backup code."
          : "Enter your authentication code.",
      );
      return;
    }

    setIsLoading(true);

    try {
      if (useBackupCode) {
        await verifyLoginBackupCode(
          code,
          rememberDevice,
        );
      } else {
        await verifyLoginTwoFactor(
          code,
          rememberDevice,
        );
      }

      window.location.href = "/signin";
    } catch (error) {
      console.error("2FA ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Verification failed.",
      );

      setIsLoading(false);
    }
  }


  /* ------------------------------------------------------------------ */
  /* 2FA SCREEN                                                         */
  /* ------------------------------------------------------------------ */

  if (requiresTwoFactor) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Two-factor authentication
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {useBackupCode
              ? "Enter one of your backup codes to finish signing in."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleTwoFactorLogin}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="two-factor-code"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              {useBackupCode
                ? "Backup code"
                : "Authentication code"}
            </label>

            <input
              id="two-factor-code"
              name="code"
              type="text"
              inputMode={
                useBackupCode ? "text" : "numeric"
              }
              autoComplete="one-time-code"
              autoFocus
              required
              disabled={isLoading}
              value={twoFactorCode}
              onChange={(event) =>
                setTwoFactorCode(event.target.value)
              }
              placeholder={
                useBackupCode
                  ? "Enter your backup code"
                  : "000000"
              }
              maxLength={
                useBackupCode ? 20 : 6
              }
              className={`h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70 ${!useBackupCode
                ? "text-center text-lg tracking-[0.3em]"
                : ""
                }`}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(event) =>
                setRememberDevice(
                  event.target.checked,
                )
              }
              disabled={isLoading}
              className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />

            <span>
              <span className="block text-sm font-medium text-slate-700">
                Remember this device
              </span>

              <span className="mt-0.5 block text-xs text-slate-400">
                Don&apos;t ask for a code again for 30
                days.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#101828] text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D2939] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? "Verifying..."
              : "Verify and sign in"}
          </button>
        </form>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            setUseBackupCode(
              (value) => !value,
            );
            setTwoFactorCode("");
            setError("");
          }}
          className="mt-5 w-full text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          {useBackupCode
            ? "Use authenticator app instead"
            : "Use a backup code instead"}
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            setRequiresTwoFactor(false);
            setTwoFactorCode("");
            setError("");
            setUseBackupCode(false);
            setRememberDevice(false);
          }}
          className="mt-3 w-full text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  /*
   * ================================================
   * NORMAL LOGIN SCREEN
   * ================================================
   */

  return (
    <div className="w-full">
      {(error || oauthErrorMessage) && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {error || oauthErrorMessage}
        </div>
      )}

      <form
        onSubmit={handleCredentialsLogin}
        className="space-y-5"
      >
        {/* Email */}
        <div>
          <label
            htmlFor="login-email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Work email
          </label>

          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="you@company.com"
            autoComplete="email"
            required
            disabled={isLoading}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
          />
        </div>

        {/* Password */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <Link
              href="/password-forgotten"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={isLoading}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (value) => !value,
                )
              }
              disabled={isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Sign in */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-[#101828] text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D2939] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? "Signing in..."
            : "Sign in"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>

        <div className="relative flex justify-center">
          <span className="px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Or continue with
          </span>
        </div>
      </div>

      {/* Social login */}
      <div className="grid grid-cols-2 gap-3">
        <SocialLoginButton provider="github" />
        <SocialLoginButton provider="google" />
      </div>
    </div>
  );
}