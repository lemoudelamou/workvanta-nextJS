import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

import { ArrowRight } from "lucide-react";

import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { buttonStyles } from "@/app/style/button-style";

import EmailVerificationSettings from "@/app/(app)/(settings)/settings/account-verification/account-verification";
import ConnectAccount from "@/app/(app)/(settings)/settings/connect-account/connect-account";
import ProfileUpdate from "@/app/(app)/(settings)/settings/profile-settings/update-profile";
import TwoFactorSettings from "@/app/(app)/(settings)/settings/two-factor-authentication/two-factor-auth";
import ThemeSelection from "@/app/(app)/(settings)/settings/appearance-settings/theme-selection";
import SessionsManagment from "@/app/(app)/(settings)/settings/sessions-management/sessions-management";
import NotificationPreferences from "@/app/(app)/(settings)/settings/notification-settings/notification-preferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/app/(app)/(settings)/settings/notification-settings/options";
import { SettingsCard, SettingsSection } from "@/app/(app)/(settings)/settings/components/SettingsSection";
import { SettingsNav } from "@/app/(app)/(settings)/settings/components/SettingsNav";


import { getProviderStatus } from "@/lib/auth/provider-status";



const SECTIONS = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Sign-in & security" },
    { id: "notifications", label: "Notifications" },
    { id: "preferences", label: "Preferences" },
    { id: "delete-account", label: "Delete account" },
];

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{
        google?: string;
        github?: string;
    }>;
}) {
    const session = await getSession();

    if (!session?.user?.id) {
        redirect("/signin");
    }

    const userId = session.user.id;

    const [
        params,
        accounts,
        user,
        twoFactor,
    ] = await Promise.all([
        searchParams,

        prisma.account.findMany({
            where: {
                userId,
            },
            select: {
                provider: true,
            },
        }),

        prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                name: true,
                email: true,
                image: true,
                emailVerified: true,
                passwordHash: true,
            },
        }),

        prisma.twoFactorAuth.findUnique({
            where: {
                userId,
            },
            select: {
                id: true,
                enabled: true,
            },
        }),
    ]);


    const githubStatus = getProviderStatus(
        "GitHub",
        params.github,
    );

    const googleStatus = getProviderStatus(
        "Google",
        params.google,
    );


    const initialEnabled = twoFactor?.enabled ?? false;

    const initialBackupCodes =
        twoFactor?.enabled
            ? await prisma.twoFactorBackupCode.count({
                where: {
                    twoFactorAuthId: twoFactor.id,
                    usedAt: null,
                },
            })
            : 0;

    const displayName =
        session.user.name?.trim() ||
        session.user.email ||
        "User";

    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();

    const email = session.user.email ?? "";

    const emailVerified = Boolean(
        user?.emailVerified
    );


    const [preferences, notificationPreferences] = await Promise.all([
        prisma.userPreference.findUnique({
            where: { userId },
            select: { theme: true },
        }),
        prisma.notificationPreference.findUnique({
            where: { userId },
            select: {
                inAppTaskAssignments: true,
                inAppComments: true,
                inAppMentions: true,
                inAppDueDates: true,
                emailTaskAssignments: true,
                emailComments: true,
                emailMentions: true,
                emailDueDates: true,
            },
        }),
    ]);

    const initialTheme =
        preferences?.theme === "LIGHT"
            ? "light"
            : preferences?.theme === "DARK"
                ? "dark"
                : "system";

    return (
        <PageBody>
            <div className="mx-auto max-w-5xl">
                <PageHeader
                    title="Settings"
                    description="Your profile, how you sign in, and what Workvanta tells you about."
                />
            </div>

            <div className="mx-auto mt-6 max-w-5xl lg:mt-8 lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-12">
                <aside className="sticky top-14 z-10 -mx-4 bg-canvas/90 px-4 py-2 backdrop-blur lg:top-8 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                    <SettingsNav items={SECTIONS} />
                </aside>

                <div className="mt-4 space-y-12 lg:mt-0">
                    <SettingsSection
                        id="profile"
                        title="Profile"
                        description="How you appear to teammates across your workspaces."
                    >
                        <SettingsCard>
                            <ProfileUpdate
                                name={session.user.name ?? ""}
                                email={session.user.email ?? ""}
                                image={session.user.image ?? ""}
                                initials={initials || "U"}
                            />
                            {!emailVerified && (
                                <div className="border-t border-border">
                                    <EmailVerificationSettings email={email} verified={emailVerified} />
                                </div>
                            )}
                        </SettingsCard>
                    </SettingsSection>

                    <SettingsSection
                        id="security"
                        title="Sign-in & security"
                        description="The ways you can sign in, extra protection, and the devices you're signed in on."
                    >
                        {githubStatus && (
                            <AlertMessage
                                variant={githubStatus.variant}
                                title={githubStatus.title}
                                message={githubStatus.message}
                            />
                        )}

                        {googleStatus && (
                            <AlertMessage
                                variant={googleStatus.variant}
                                title={googleStatus.title}
                                message={googleStatus.message}
                            />
                        )}

                        <SettingsCard
                            title="Sign-in methods"
                            description="Use a password, GitHub or Google. Keep at least one."
                        >
                            <ConnectAccount
                                accounts={accounts.map((account) => ({
                                    provider: account.provider === "github" ? "github" : "google",
                                }))}
                                hasPassword={Boolean(user?.passwordHash)}
                            />
                        </SettingsCard>

                        <SettingsCard>
                            <TwoFactorSettings
                                initialEnabled={initialEnabled}
                                initialBackupCodes={initialBackupCodes}
                            />
                        </SettingsCard>

                        <SettingsCard
                            title="Where you're signed in"
                            description="Sign out any device you no longer use."
                        >
                            <SessionsManagment />
                        </SettingsCard>
                    </SettingsSection>

                    <SettingsSection
                        id="notifications"
                        title="Notifications"
                        description="Choose what reaches you in Workvanta and by email."
                    >
                        <SettingsCard>
                            <NotificationPreferences
                                initial={{ ...DEFAULT_NOTIFICATION_PREFERENCES, ...notificationPreferences }}
                            />
                        </SettingsCard>
                    </SettingsSection>

                    <SettingsSection
                        id="preferences"
                        title="Preferences"
                        description="How Workvanta looks on this account."
                    >
                        <SettingsCard title="Theme" description="Pick a look, or follow your device's light and dark setting.">
                            <ThemeSelection initialTheme={initialTheme} />
                        </SettingsCard>
                    </SettingsSection>

                    <SettingsSection
                        id="delete-account"
                        title="Delete account"
                        description="Permanently remove your account and the data tied to it."
                    >
                        <SettingsCard tone="danger">
                            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                                    If you own workspaces other people use, you&apos;ll hand them over
                                    first. Deleting can&apos;t be undone.
                                </p>
                                <Link
                                    href="/settings/delete-account"
                                    className={`${buttonStyles({ variant: "danger" })} shrink-0`}
                                >
                                    Delete account
                                    <ArrowRight className="size-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </SettingsCard>
                    </SettingsSection>
                </div>
            </div>
        </PageBody>
    );
}
