import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";

import {
    Bell,
    Globe2,
    Link2,
    Palette,
    Shield,
    Trash2,
    User,
} from "lucide-react";

import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { AlertMessage } from "@/components/ui/AlertMessage";

import {
    iconTile,
    sectionClass,
} from "@/app/style/ui-tokens";

import EmailVerificationSettings from "@/app/(app)/(settings)/settings/account-verification/account-verification";
import ConnectAccount from "@/app/(app)/(settings)/settings/connect-account/connect-account";
import ProfileUpdate from "@/app/(app)/(settings)/settings/profile-settings/update-profile";
import TwoFactorSettings from "@/app/(app)/(settings)/settings/two-factor-authentication/two-factor-auth";
import ThemeSelection from "@/app/(app)/(settings)/settings/appearance-settings/theme-selection";
import SessionsManagment from "@/app/(app)/(settings)/settings/sessions-management/sessions-management";
import ChangeLanguage from "@/app/(app)/(settings)/settings/language-settings/change-language";


import { getProviderStatus } from "@/lib/auth/provider-status";



function SectionHeader({
    title,
    description,
    icon: Icon,
}: {
    title: string;
    description: string;
    icon: typeof User;
}) {
    return (
        <div className="relative flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-5 sm:px-7 sm:py-6 dark:border-white/[0.06]">
            <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {title}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>

            <div className={`${iconTile} size-10 rounded-xl`}>
                <Icon
                    className="size-4"
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}



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


    const preferences =
        await prisma.userPreference.findUnique({
            where: {
                userId,
            },
            select: {
                language: true,
                theme: true,
            },
        });

    const initialTheme =
        preferences?.theme === "LIGHT"
            ? "light"
            : preferences?.theme === "DARK"
                ? "dark"
                : "system";


    return (
        <PageBody>


                <header className="mb-8">
                    <PageHeader
                        eyebrow="Workvanta"
                        title="Settings"
                        description="Manage your account, preferences, notifications, and connected services."
                        actions=""
                    />
                </header>


                <div className="space-y-7">


                    <section className={sectionClass}>
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-slate-200/40 blur-3xl dark:bg-blue-500/[0.05]"
                        />

                        <SectionHeader
                            title="Account"
                            description="Manage your Workvanta profile information."
                            icon={User}
                        />

                        <ProfileUpdate
                            name={session.user.name ?? ""}
                            email={session.user.email ?? ""}
                            image={session.user.image ?? ""}
                            initials={initials || "U"}
                        />

                        <div className="border-t border-slate-200/70 dark:border-white/[0.06]">
                            <EmailVerificationSettings
                                email={email}
                                verified={emailVerified}
                            />
                        </div>
                    </section>



                    <section className={sectionClass}>
                        <SectionHeader
                            title="Connected accounts"
                            description="Connect external accounts to your Workvanta account."
                            icon={Link2}
                        />

                        <div className="relative space-y-4 p-5 sm:p-7">

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

                            <ConnectAccount
                                accounts={accounts.map(
                                    (account) => ({
                                        provider:
                                            account.provider === "github"
                                                ? "github"
                                                : "google",
                                    })
                                )}
                                hasPassword={Boolean(
                                    user?.passwordHash
                                )}
                            />
                        </div>
                    </section>



                    <section className={sectionClass}>
                        <SectionHeader
                            title="Security"
                            description="Manage your password, authentication, and sessions."
                            icon={Shield}
                        />

                        <TwoFactorSettings
                            initialEnabled={initialEnabled}
                            initialBackupCodes={
                                initialBackupCodes
                            }
                        />
                    </section>



                    <section className={sectionClass}>
                        <SectionHeader
                            title="Appearance"
                            description="Customize how Workvanta looks and feels."
                            icon={Palette}
                        />

                        <ThemeSelection
                            initialTheme={initialTheme}
                        />
                    </section>



                    <section className={sectionClass}>
                        <SectionHeader
                            title="Language"
                            description="Change your language preferences."
                            icon={Globe2}
                        />

                        <ChangeLanguage
                            initialLanguage={
                                preferences?.language ?? "en"
                            }
                        />
                    </section>



                    <section className={sectionClass}>
                        <SectionHeader
                            title="Notifications"
                            description="Choose which updates you want to receive."
                            icon={Bell}
                        />

                        {/* TODO: Add notification management */}
                    </section>


                    <section className={sectionClass}>
                        <SectionHeader
                            title="Sessions"
                            description="Keep track of all connected devices."
                            icon={Shield}
                        />

                        <SessionsManagment />
                    </section>


                    <section className="overflow-hidden rounded-2xl border border-red-200/80 bg-white/70 shadow-[0_24px_80px_rgba(127,29,29,0.05)] backdrop-blur-xl dark:border-red-500/20 dark:bg-red-950/[0.08] dark:shadow-none sm:rounded-[28px]">

                        <div className="border-b border-red-200/70 px-5 py-5 sm:px-7 sm:py-6 dark:border-red-500/15">
                            <div className="flex items-start justify-between gap-4">

                                <div>
                                    <h2 className="text-xl font-semibold tracking-tight text-red-950 dark:text-red-100">
                                        Danger zone
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-red-700/70 dark:text-red-200/60">
                                        Irreversible account actions live here.
                                    </p>
                                </div>

                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/[0.08] dark:text-red-300">
                                    <Trash2
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </div>

                            </div>
                        </div>


                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">

                            <div>
                                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                    Delete your account
                                </p>

                                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                                    Permanently remove your Workvanta account and associated data.
                                </p>
                            </div>


                            <Link
                                href="/settings/delete-account"
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 dark:border-red-500/20 dark:bg-red-500/[0.08] dark:text-red-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/[0.14]"
                            >
                                <Trash2
                                    className="size-4"
                                    aria-hidden="true"
                                />

                                Delete your Account
                            </Link>

                        </div>
                    </section>

                </div>
        </PageBody>
    );
}

