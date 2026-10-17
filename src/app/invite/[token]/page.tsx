import Link from "next/link";
import type { ReactNode } from "react";
import { CircleAlert, Clock, LinkIcon, LogOut, UsersRound } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logout } from "@/app/(auth)/signin/actions";
import { acceptInvitationAction } from "@/app/invite/[token]/invitation-actions";
import { WorkspaceBadge } from "@/app/(app)/(workspace)/workspace/components/WorkspaceCard";
import { PROJECT_ROLE_DESCRIPTIONS, WORKSPACE_ROLE_DESCRIPTIONS, type ProjectRoleName, type WorkspaceRoleName } from "@/lib/auth/permissions";

type InvitePageProps = {
    params: Promise<{ token: string }>;
};

const EXPIRES = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

const primary =
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:text-[#0f1115]";
const secondary =
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand";

function formatRole(role: string) {
    return role.charAt(0) + role.slice(1).toLowerCase();
}

/** The page frame: logo, then one centred card. */
function Shell({ children }: { children: ReactNode }) {
    return (
        <main className="relative flex min-h-dvh flex-col bg-canvas px-4 py-6 text-foreground sm:px-8">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--color-brand)_14%,transparent),transparent)]"
            />
            <Link href="/" className="relative flex w-fit items-center gap-2.5 text-[15px] font-semibold text-foreground">
                <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-sm text-background">W</span>
                workvanta
            </Link>
            <div className="relative flex flex-1 items-center justify-center py-10">
                <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[0_24px_64px_-24px_rgba(15,17,21,0.25)] sm:p-8">
                    {children}
                </div>
            </div>
        </main>
    );
}

function Problem({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return (
        <Shell>
            <div className="text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-5">
                    {icon}
                </span>
                <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
                <Link href="/dashboard" className={`${secondary} mt-6`}>
                    Go to Workvanta
                </Link>
            </div>
        </Shell>
    );
}

export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
            workspace: { select: { id: true, name: true, _count: { select: { members: true } } } },
            project: { select: { name: true } },
        },
    });

    if (!invitation) {
        return (
            <Problem icon={<LinkIcon />} title="This link doesn't work">
                The invitation may have been cancelled, or the link was copied incompletely. Ask the person who invited
                you to send a new one.
            </Problem>
        );
    }

    if (invitation.acceptedAt) {
        return (
            <Problem icon={<UsersRound />} title="Invitation already used">
                This invitation to {invitation.workspace.name} has been accepted. Sign in to open the workspace.
            </Problem>
        );
    }

    if (invitation.expiresAt < new Date()) {
        return (
            <Problem icon={<Clock />} title="This invitation has expired">
                Invitations to {invitation.workspace.name} last a week. Ask the person who invited you to send a new
                one.
            </Problem>
        );
    }

    const session = await getSession();
    const workspaceRole = invitation.role as WorkspaceRoleName;
    const projectRole = invitation.projectRole as ProjectRoleName | null;
    const memberCount = invitation.workspace._count.members;

    const summary = (
        <>
            <div className="flex flex-col items-center text-center">
                <WorkspaceBadge id={invitation.workspace.id} name={invitation.workspace.name} size="lg" />
                <p className="mt-5 text-sm text-muted-foreground">You&apos;re invited to join</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{invitation.workspace.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {memberCount} {memberCount === 1 ? "person" : "people"} already here
                </p>
            </div>

            <dl className="mt-6 divide-y divide-border rounded-2xl border border-border text-sm">
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-foreground">Your role</dt>
                    <dd className="text-right">
                        <span className="font-medium text-foreground">{formatRole(workspaceRole)}</span>
                        <span className="block text-xs text-muted-foreground">{WORKSPACE_ROLE_DESCRIPTIONS[workspaceRole]}</span>
                    </dd>
                </div>
                {invitation.project && (
                    <div className="flex items-start justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">Project</dt>
                        <dd className="text-right">
                            <span className="font-medium text-foreground">{invitation.project.name}</span>
                            {projectRole && (
                                <span className="block text-xs text-muted-foreground">
                                    {formatRole(projectRole)}: {PROJECT_ROLE_DESCRIPTIONS[projectRole].toLowerCase()}
                                </span>
                            )}
                        </dd>
                    </div>
                )}
                <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <dt className="text-muted-foreground">Sent to</dt>
                    <dd className="min-w-0 truncate font-medium text-foreground">{invitation.email}</dd>
                </div>
            </dl>
        </>
    );

    const expiry = (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            This invitation expires on {EXPIRES.format(invitation.expiresAt)}.
        </p>
    );

    // Not signed in: show the invitation first, then sign up or sign in.
    if (!session?.user?.id) {
        const existingUser = await prisma.user.findUnique({
            where: { email: invitation.email },
            select: { id: true },
        });
        const query = `callbackUrl=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invitation.email)}`;

        return (
            <Shell>
                {summary}
                <div className="mt-6 space-y-2.5">
                    {existingUser ? (
                        <>
                            <Link href={`/signin?${query}`} className={primary}>
                                Sign in to accept
                            </Link>
                            <p className="text-center text-xs text-muted-foreground">
                                Sign in as {invitation.email} and you&apos;ll come straight back here.
                            </p>
                        </>
                    ) : (
                        <>
                            <Link href={`/signup?${query}`} className={primary}>
                                Create account and join
                            </Link>
                            <Link href={`/signin?${query}`} className={secondary}>
                                I already have an account
                            </Link>
                        </>
                    )}
                </div>
                {expiry}
            </Shell>
        );
    }

    // Signed in as someone else.
    if (session.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return (
            <Shell>
                {summary}
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>
                        You&apos;re signed in as <strong className="font-semibold">{session.user.email}</strong>. Switch to{" "}
                        <strong className="font-semibold">{invitation.email}</strong> to accept.
                    </p>
                </div>
                <form action={logout.bind(null, invitation.email)} className="mt-4">
                    <button type="submit" className={primary}>
                        <LogOut className="size-4" aria-hidden="true" />
                        Sign out and switch accounts
                    </button>
                </form>
                {expiry}
            </Shell>
        );
    }

    return (
        <Shell>
            {summary}
            <form action={acceptInvitationAction.bind(null, token)} className="mt-6 space-y-2.5">
                <button type="submit" className={primary}>
                    Accept and join {invitation.workspace.name}
                </button>
                <Link href="/dashboard" className={secondary}>
                    Not now
                </Link>
            </form>
            {expiry}
        </Shell>
    );
}
