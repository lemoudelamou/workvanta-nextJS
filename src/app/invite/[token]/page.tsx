import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { acceptInvitationAction } from "@/app/invite/[token]/invitation-actions";

type InvitePageProps = {
    params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { workspace: true, project: true },
    });

    if (!invitation) {
        return <InvalidInvite reason="This invitation link is invalid." />;
    }

    if (invitation.acceptedAt) {
        return (
            <InvalidInvite reason="This invitation has already been used." />
        );
    }

    if (invitation.expiresAt < new Date()) {
        return <InvalidInvite reason="This invitation has expired." />;
    }

    const session = await getSession();

    // Case 1: not signed in at all — route to signup or signin,
    // carrying the invite token through as the callback.
    if (!session?.user?.id) {
        const existingUser = await prisma.user.findUnique({
            where: { email: invitation.email },
        });

        const callbackUrl = `/invite/${token}`;
        const emailParam = encodeURIComponent(invitation.email);

        if (existingUser) {
            redirect(
                `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&email=${emailParam}`,
            );
        } else {
            redirect(
                `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}&email=${emailParam}`,
            );
        }
    }

    // Case 2: signed in, but as a different email than the one invited.
    if (session.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return (
            <WrongAccountNotice
                loggedInAs={session.user.email ?? ""}
                invitedEmail={invitation.email}
            />
        );
    }

    // Case 3: signed in as the right person — show accept confirmation.
    return (
        <AcceptInviteConfirmation
            workspaceName={invitation.workspace.name}
            projectName={invitation.project?.name}
            token={token}
        />
    );
}

function InvalidInvite({ reason }: { reason: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
            <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
                <h1 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Invitation unavailable
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {reason}
                </p>
            </div>
        </main>
    );
}

function WrongAccountNotice({
                                loggedInAs,
                                invitedEmail,
                            }: {
    loggedInAs: string;
    invitedEmail: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
            <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
                <h1 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Wrong account
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    You&apos;re signed in as <strong>{loggedInAs}</strong>, but
                    this invitation was sent to{" "}
                    <strong>{invitedEmail}</strong>. Sign out and sign in with
                    the invited email to accept it.
                </p>
                <a
                    href={`/signout?callbackUrl=${encodeURIComponent(
                        `/signin?email=${invitedEmail}`,
                    )}`}
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                >
                    Sign out and switch accounts
                </a>
            </div>
        </main>
    );
}

function AcceptInviteConfirmation({
                                      workspaceName,
                                      projectName,
                                      token,
                                  }: {
    workspaceName: string;
    projectName?: string;
    token: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
            <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
                <h1 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Join {workspaceName}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {projectName
                        ? `You've been invited to the "${projectName}" project in this workspace.`
                        : "You've been invited to join this workspace."}
                </p>
                <form action={acceptInvitationAction.bind(null, token)}>
                    <button
                        type="submit"
                        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                    >
                        Accept invitation
                    </button>
                </form>
            </div>
        </main>
    );
}
