import { ShieldCheck, Trash2, UserPlus, UsersRound, Crown, Mail } from "lucide-react";
import { notFound } from "next/navigation";

import { requireMembership } from "@/lib/auth/team";
import { prisma } from "@/lib/db/prisma";
import { accentFor, accentVars } from "@/lib/accent";
import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { PageBody} from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { buttonStyles } from "@/app/style/button-style";
import { removeTeamAction } from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";
import { WorkspaceMemberRoleSelect } from "@/app/(app)/(workspace)/workspace/[slug]/team/componenets/WorkspaceRole";
import { InviteTeamForm } from "@/app/(app)/(workspace)/workspace/[slug]/team/componenets/InviteTeamForm";
import { Kpi } from "@/app/style/Kpi";
import {
    canRemoveWorkspaceMember,
    canWorkspace,
    ForbiddenError,
    invitableWorkspaceRoles,
    WORKSPACE_ROLE_DESCRIPTIONS,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";
import {
    RevokeInvitationButton,
    TransferOwnershipButton,
} from "@/app/(app)/(workspace)/workspace/[slug]/team/componenets/MemberActions";

const ROLE_RANK: Record<string, number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
    GUEST: 3,
};


const JOINED = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
const EXPIRES = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

function formatRole(role: string) {
    return role.charAt(0) + role.slice(1).toLowerCase().replaceAll("_", " ");
}

function getInitials(name: string | null, email: string) {
    const value = name?.trim() || email;
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return value.slice(0, 2).toUpperCase();
}

const KPI_STRIP =
    "grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border";



export default async function TeamPage({
                                           params,
                                       }: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    let membership: Awaited<ReturnType<typeof requireMembership>>;

    try {
        membership = await requireMembership(slug);
    } catch (error) {
        if (error instanceof ForbiddenError) notFound();
        throw error;
    }

    const { workspace } = membership;

    const rawMembers = await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            userId: true,
            role: true,
            createdAt: true,
            user: {
                select: { id: true, name: true, email: true, image: true },
            },
        },
    });

    const members = [...rawMembers].sort(
        (a, b) => (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99),
    );

    const myRole = membership.role as WorkspaceRoleName;
    const canInvite = canWorkspace(myRole, "members.invite");
    const canManageRoles = canWorkspace(myRole, "members.changeRole");
    const canTransfer = canWorkspace(myRole, "workspace.transfer");
    const canManageInvitations = canWorkspace(myRole, "invitations.manage");
    const canInviteAdmin = invitableWorkspaceRoles(myRole).includes("ADMIN");

    const pendingInvitations = canManageInvitations
        ? await prisma.invitation.findMany({
            where: {
                workspaceId: workspace.id,
                acceptedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                role: true,
                projectRole: true,
                expiresAt: true,
                project: { select: { name: true } },
            },
        })
        : [];

    const managerCount = members.filter(
        (m) => m.role === "OWNER" || m.role === "ADMIN",
    ).length;

    return (
        <PageBody>
            <Breadcrumb
                items={[
                    { label: workspace.name, href: `/workspace/${workspace.slug}`, truncate: true },
                    { label: "Team" },
                ]}
            />

            <PageHeader
                eyebrow={workspace.name}
                title="Team"
                description="See who has access to this workspace and what they can do."
            />

            <section aria-label="Team summary" className={`mt-8 ${KPI_STRIP}`}>
                <Kpi
                    tone="blue"
                    icon={<UsersRound />}
                    label="Members"
                    value={members.length}
                    helper="People in this workspace"
                />
                <Kpi
                    tone="violet"
                    icon={<Crown />}
                    label="Owners and admins"
                    value={managerCount}
                    helper="Can manage the workspace"
                />
                <Kpi
                    tone="amber"
                    icon={<ShieldCheck />}
                    label="Your role"
                    value={formatRole(membership.role)}
                    helper={WORKSPACE_ROLE_DESCRIPTIONS[myRole]}
                />
            </section>

            {canInvite && (
                <section
                    aria-labelledby="invite"
                    className="mt-10 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
                >
                    <div className="flex items-start gap-3">
                        <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"
                        >
                            <UserPlus className="size-[18px]" />
                        </span>
                        <div>
                            <h2
                                id="invite"
                                className="text-lg font-semibold tracking-tight text-foreground"
                            >
                                Invite a member
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Enter their email and choose a role. They&apos;ll get an
                                invitation to join {workspace.name}.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <InviteTeamForm slug={slug} canInviteAdmin={canInviteAdmin} />
                    </div>
                </section>
            )}

            <section aria-labelledby="members" className="mt-10">
                <div className="mb-5">
                    <div className="flex items-center gap-2.5">
                        <h2
                            id="members"
                            className="text-lg font-semibold tracking-tight text-foreground"
                        >
                            Members
                        </h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                            {members.length}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        People who have access to this workspace.
                    </p>
                </div>

                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {members.map((member) => {
                        const isCurrentUser = member.userId === membership.userId;
                        const isTargetOwner = member.role === "OWNER";

                        const canChangeThisRole =
                            canManageRoles && !isCurrentUser && !isTargetOwner;
                        const canRemoveThisMember = canRemoveWorkspaceMember(
                            { role: myRole, memberId: membership.id },
                            { role: member.role as WorkspaceRoleName, memberId: member.id },
                        );
                        const canTransferToThisMember =
                            canTransfer &&
                            !isCurrentUser &&
                            (member.role === "ADMIN" || member.role === "MEMBER");

                        const displayName = member.user.name ?? member.user.email;

                        return (
                            <li
                                key={member.id}
                                className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-6 sm:px-6"
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                    {member.user.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={member.user.image}
                                            alt=""
                                            className="size-10 shrink-0 rounded-full border border-border object-cover"
                                        />
                                    ) : (
                                        <div
                                            aria-hidden="true"
                                            style={accentVars(accentFor(member.user.id))}
                                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.14)] text-xs font-semibold text-[rgb(var(--accent))]"
                                        >
                                            {getInitials(member.user.name, member.user.email)}
                                        </div>
                                    )}

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {displayName}
                                            </p>
                                            {isCurrentUser && (
                                                <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {member.user.email}
                                        </p>
                                    </div>
                                </div>

                                <time
                                    dateTime={member.createdAt.toISOString()}
                                    className="hidden w-28 shrink-0 text-xs text-muted-foreground lg:block"
                                >
                                    Joined {JOINED.format(member.createdAt)}
                                </time>

                                <div className="flex flex-wrap items-center gap-2 pl-[3.375rem] sm:justify-end sm:pl-0">
                                    {canChangeThisRole ? (
                                        <WorkspaceMemberRoleSelect
                                            slug={slug}
                                            memberId={member.id}
                                            currentRole={member.role as "ADMIN" | "MEMBER" | "GUEST"}
                                        />
                                    ) : (
                                        <RoleBadge role={member.role} />
                                    )}

                                    {canTransferToThisMember && (
                                        <TransferOwnershipButton
                                            slug={slug}
                                            memberId={member.id}
                                            memberName={displayName}
                                        />
                                    )}

                                    {canRemoveThisMember && (
                                        <form action={removeTeamAction.bind(null, slug, member.id)}>
                                            <button
                                                type="submit"
                                                aria-label={`Remove ${displayName}`}
                                                className={buttonStyles({ variant: "danger", size: "sm" })}
                                            >
                                                <Trash2 className="size-3.5" aria-hidden="true" />
                                                Remove
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {canManageInvitations && pendingInvitations.length > 0 && (
                <section aria-labelledby="pending-invitations" className="mt-10">
                    <div className="mb-5">
                        <div className="flex items-center gap-2.5">
                            <h2
                                id="pending-invitations"
                                className="text-lg font-semibold tracking-tight text-foreground"
                            >
                                Pending invitations
                            </h2>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                                {pendingInvitations.length}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Invitations that haven&apos;t been accepted yet.
                        </p>
                    </div>

                    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {pendingInvitations.map((invitation) => {
                            const canRevoke =
                                invitation.role !== "ADMIN" || myRole === "OWNER";

                            return (
                                <li
                                    key={invitation.id}
                                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                                        <span
                                            aria-hidden="true"
                                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                                        >
                                            <Mail className="size-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {invitation.email}
                                            </p>
                                            <p className="truncate text-sm text-muted-foreground">
                                                {invitation.project
                                                    ? `${formatRole(invitation.projectRole ?? "VIEWER")} on “${invitation.project.name}”`
                                                    : `Joins as ${formatRole(invitation.role)}`}
                                            </p>
                                        </div>
                                    </div>

                                    <time
                                        dateTime={invitation.expiresAt.toISOString()}
                                        className="hidden w-32 shrink-0 text-xs text-muted-foreground lg:block"
                                    >
                                        Expires {EXPIRES.format(invitation.expiresAt)}
                                    </time>

                                    <div className="flex items-center gap-2 pl-[3.375rem] sm:pl-0">
                                        <RoleBadge role={invitation.role} />
                                        {canRevoke && (
                                            <RevokeInvitationButton
                                                slug={slug}
                                                invitationId={invitation.id}
                                                email={invitation.email}
                                            />
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </PageBody>
    );
}