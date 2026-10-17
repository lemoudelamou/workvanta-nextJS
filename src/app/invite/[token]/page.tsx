import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logout } from "@/app/(auth)/signin/actions";
import { acceptInvitationAction } from "@/app/invite/[token]/invitation-actions";

type InvitePageProps = {
    params: Promise<{ token: string }>;
};

export default async function InvitePage({
    params,
}: InvitePageProps) {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
            workspace: true,
            project: true,
        },
    });

    if (!invitation) {
        return (
            <InvalidInvite
                reason="This invitation link is invalid."
            />
        );
    }

    if (invitation.acceptedAt) {
        return (
            <InvalidInvite
                reason="This invitation has already been used."
            />
        );
    }

    if (invitation.expiresAt < new Date()) {
        return (
            <InvalidInvite
                reason="This invitation has expired."
            />
        );
    }

    const session = await getSession();

    // Case 1: Not signed in.
    // Redirect to signup or signin while preserving the invitation.
    if (!session?.user?.id) {
        const existingUser = await prisma.user.findUnique({
            where: {
                email: invitation.email,
            },
            select: {
                id: true,
            },
        });

        const callbackUrl = `/invite/${token}`;
        const emailParam = encodeURIComponent(invitation.email);
        const encodedCallback = encodeURIComponent(callbackUrl);

        if (existingUser) {
            redirect(
                `/signin?callbackUrl=${encodedCallback}&email=${emailParam}`,
            );
        }

        redirect(
            `/signup?callbackUrl=${encodedCallback}&email=${emailParam}`,
        );
    }

    // Case 2: Signed in with a different email.
    if (
        session.user.email?.toLowerCase() !==
        invitation.email.toLowerCase()
    ) {
        return (
            <WrongAccountNotice
                loggedInAs={session.user.email ?? ""}
                invitedEmail={invitation.email}
            />
        );
    }

    return (
        <AcceptInviteConfirmation
            workspaceName={invitation.workspace.name}
            projectName={invitation.project?.name}
            token={token}
        />
    );
}

function InvalidInvite({
    reason,
}: {
    reason: string;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
            <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
                <h1 className="text-lg font-semibold text-foreground">
                    Invitation unavailable
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
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
            <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
                <h1 className="text-lg font-semibold text-foreground">
                    Wrong account
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                    You&apos;re signed in as{" "}
                    <strong>{loggedInAs}</strong>, but this invitation
                    was sent to <strong>{invitedEmail}</strong>. Sign
                    out and sign in with the invited email to accept it.
                </p>

                <form action={logout.bind(null, invitedEmail)}>
                    <button
                        type="submit"
                        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white dark:bg-brand dark:text-[#0f1115]"
                    >
                        Sign out and switch accounts
                    </button>
                </form>
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
            <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/5">
                <h1 className="text-lg font-semibold text-foreground">
                    Join {workspaceName}
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                    {projectName
                        ? `You've been invited to the "${projectName}" project in this workspace.`
: "You've been invited to join this workspace."}
</p>

<form action={acceptInvitationAction.bind(null, token)}>
    <button
        type="submit"
        className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white dark:bg-brand dark:text-[#0f1115]"
    >
        Accept invitation
    </button>
</form>
</div>
</main>
);
}
