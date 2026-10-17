import { Clock, Crown, Link2, Mail, Trash2, UserMinus, UserPlus } from "lucide-react";
import { notFound } from "next/navigation";

import { requireMembership } from "@/lib/auth/team";
import { prisma } from "@/lib/db/prisma";
import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { PageBody } from "@/components/ui/PageBody";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { timeAgo } from "@/helpers/timeAgo";
import { RowActions, type RowAction } from "@/components/ui/RowActions";
import { SearchableList } from "@/components/ui/SearchableList";
import { RolesGuide } from "@/components/ui/RolesGuide";
import {
    removeTeamAction,
    revokeInvitationAction,
    transferOwnershipAction,
} from "@/app/(app)/(workspace)/workspace/[slug]/team/team-actions";
import { WorkspaceMemberRoleSelect } from "@/app/(app)/(workspace)/workspace/[slug]/team/componenets/WorkspaceRole";
import { InviteTeamForm } from "@/app/(app)/(workspace)/workspace/[slug]/team/componenets/InviteTeamForm";
import {
    canRemoveWorkspaceMember,
    canWorkspace,
    ForbiddenError,
    invitableWorkspaceRoles,
    WORKSPACE_ROLE_DESCRIPTIONS,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";

const ROLE_RANK: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2, GUEST: 3 };

/** Same colours as the role picker. */
const WORKSPACE_ROLE_DOTS: Record<WorkspaceRoleName, string> = {
    OWNER: "bg-amber-500",
    ADMIN: "bg-brand",
    MEMBER: "bg-status-done",
    GUEST: "bg-muted-foreground/60",
};

const JOINED = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const DAY_MS = 86_400_000;
/** Expired invitations stay listed this long so admins can see they lapsed. */
const SHOW_EXPIRED_FOR_DAYS = 30;

function formatRole(role: string) {
    return role.charAt(0) + role.slice(1).toLowerCase().replaceAll("_", " ");
}

function expiryLabel(expiresAt: Date, now: number) {
    const days = Math.ceil((expiresAt.getTime() - now) / DAY_MS);
    if (days <= 0) return { text: "Expired", expired: true };
    if (days === 1) return { text: "Expires tomorrow", expired: false };
    return { text: `Expires in ${days} days`, expired: false };
}

function RolePill({ role }: { role: string }) {
    return (
        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-foreground/[0.05] px-3 text-[13px] font-medium text-foreground ring-1 ring-inset ring-foreground/10">
            <span aria-hidden="true" className={`size-2 rounded-full ${WORKSPACE_ROLE_DOTS[role as WorkspaceRoleName] ?? "bg-muted-foreground/60"}`} />
            {formatRole(role)}
        </span>
    );
}

const card =
    "overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04),0_8px_24px_-16px_rgba(23,26,33,0.12)]";

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    let membership: Awaited<ReturnType<typeof requireMembership>>;

    try {
        membership = await requireMembership(slug);
    } catch (error) {
        if (error instanceof ForbiddenError) notFound();
        throw error;
    }

    const { workspace } = membership;
    const now = new Date().getTime();

    const rawMembers = await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            userId: true,
            role: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true, image: true } },
        },
    });
    const members = [...rawMembers].sort((a, b) => (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99));

    const myRole = membership.role as WorkspaceRoleName;
    const canInvite = canWorkspace(myRole, "members.invite");
    const canManageRoles = canWorkspace(myRole, "members.changeRole");
    const canTransfer = canWorkspace(myRole, "workspace.transfer");
    const canManageInvitations = canWorkspace(myRole, "invitations.manage");
    const canInviteAdmin = invitableWorkspaceRoles(myRole).includes("ADMIN");

    const invitations = canManageInvitations
        ? await prisma.invitation.findMany({
              where: {
                  workspaceId: workspace.id,
                  acceptedAt: null,
                  expiresAt: { gt: new Date(now - SHOW_EXPIRED_FOR_DAYS * DAY_MS) },
              },
              orderBy: { createdAt: "desc" },
              select: {
                  id: true,
                  email: true,
                  token: true,
                  role: true,
                  projectRole: true,
                  expiresAt: true,
                  createdAt: true,
                  project: { select: { name: true } },
                  invitedBy: { select: { name: true, email: true } },
              },
          })
        : [];
    const pendingCount = invitations.filter((i) => i.expiresAt.getTime() > now).length;

    return (
        <PageBody>
            <Breadcrumb
                items={[
                    { label: workspace.name, href: `/workspace/${workspace.slug}`, truncate: true },
                    { label: "Team" },
                ]}
            />

            <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">Team</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {members.length} {members.length === 1 ? "person" : "people"} in {workspace.name}
                        {pendingCount > 0 && `, ${pendingCount} pending ${pendingCount === 1 ? "invitation" : "invitations"}`}
                    </p>
                </div>
                <AvatarStack people={members.map((m) => m.user)} max={6} size="md" label={`${members.length} people`} />
            </header>

            <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-6">
                    {canInvite && (
                        <section aria-labelledby="invite" className={`${card} p-5 sm:p-6`}>
                            <div className="flex items-center gap-3">
                                <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-brand/15">
                                    <UserPlus className="size-[18px]" />
                                </span>
                                <div>
                                    <h2 id="invite" className="text-[15px] font-semibold text-foreground">
                                        Invite people
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        They&apos;ll get an email with a link to join {workspace.name}.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <InviteTeamForm slug={slug} canInviteAdmin={canInviteAdmin} />
                            </div>
                        </section>
                    )}

                    <section aria-labelledby="people" className={card}>
                        <SearchableList
                            count={members.length}
                            placeholder="Search people"
                            header={
                                <h2 id="people" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                                    People
                                    <span className="rounded-full bg-muted px-2 text-xs font-medium leading-5 tabular-nums text-muted-foreground">
                                        {members.length}
                                    </span>
                                </h2>
                            }
                        >
                            <ul className="divide-y divide-border border-t border-border">
                                {members.map((member) => {
                                    const isCurrentUser = member.userId === membership.userId;
                                    const isTargetOwner = member.role === "OWNER";
                                    const canChangeThisRole = canManageRoles && !isCurrentUser && !isTargetOwner;
                                    const canRemoveThisMember = canRemoveWorkspaceMember(
                                        { role: myRole, memberId: membership.id },
                                        { role: member.role as WorkspaceRoleName, memberId: member.id },
                                    );
                                    const canTransferToThisMember =
                                        canTransfer && !isCurrentUser && (member.role === "ADMIN" || member.role === "MEMBER");
                                    const displayName = member.user.name ?? member.user.email;

                                    const actions: RowAction[] = [
                                        ...(canTransferToThisMember
                                            ? [
                                                  {
                                                      label: "Make owner",
                                                      icon: <Crown />,
                                                      run: transferOwnershipAction.bind(null, slug, member.id),
                                                      confirm: {
                                                          title: `Make ${displayName} the owner?`,
                                                          description:
                                                              "They'll get full control of the workspace, including deleting it. You'll stay on as an admin.",
                                                          confirmLabel: "Make owner",
                                                          loadingLabel: "Transferring...",
                                                      },
                                                  },
                                              ]
                                            : []),
                                        ...(canRemoveThisMember
                                            ? [
                                                  {
                                                      label: "Remove from workspace",
                                                      icon: <UserMinus />,
                                                      danger: true,
                                                      run: removeTeamAction.bind(null, slug, member.id),
                                                      confirm: {
                                                          title: `Remove ${displayName}?`,
                                                          description: `They'll lose access to ${workspace.name} and its projects. Their tasks and comments stay.`,
                                                          confirmLabel: "Remove",
                                                          loadingLabel: "Removing...",
                                                      },
                                                  },
                                              ]
                                            : []),
                                    ];

                                    return (
                                        <li
                                            key={member.id}
                                            data-search={`${member.user.name ?? ""} ${member.user.email} ${member.role}`}
                                            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5"
                                        >
                                            <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                                                <PersonAvatar person={member.user} size={38} />
                                                <div className="min-w-0">
                                                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                        <span className="truncate">{displayName}</span>
                                                        {isCurrentUser && (
                                                            <span className="shrink-0 text-xs font-normal text-muted-foreground">(you)</span>
                                                        )}
                                                    </p>
                                                    <p className="truncate text-[13px] text-muted-foreground">{member.user.email}</p>
                                                </div>
                                            </div>

                                            <time
                                                dateTime={member.createdAt.toISOString()}
                                                className="hidden w-32 shrink-0 text-xs text-muted-foreground lg:block"
                                            >
                                                Joined {JOINED.format(member.createdAt)}
                                            </time>

                                            <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-[50px] sm:pl-0">
                                                {canChangeThisRole ? (
                                                    <WorkspaceMemberRoleSelect
                                                        slug={slug}
                                                        memberId={member.id}
                                                        currentRole={member.role as "ADMIN" | "MEMBER" | "GUEST"}
                                                    />
                                                ) : (
                                                    <RolePill role={member.role} />
                                                )}
                                                {actions.length > 0 ? (
                                                    <RowActions label={`Actions for ${displayName}`} actions={actions} />
                                                ) : (
                                                    <span aria-hidden="true" className="w-8" />
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </SearchableList>
                    </section>

                    {canManageInvitations && invitations.length > 0 && (
                        <section aria-labelledby="invitations" className={card}>
                            <h2
                                id="invitations"
                                className="flex items-center gap-2 px-4 py-3 text-[15px] font-semibold text-foreground sm:px-5"
                            >
                                Invitations
                                <span className="rounded-full bg-muted px-2 text-xs font-medium leading-5 tabular-nums text-muted-foreground">
                                    {invitations.length}
                                </span>
                            </h2>
                            <ul className="divide-y divide-border border-t border-border">
                                {invitations.map((invitation) => {
                                    const canRevoke = invitation.role !== "ADMIN" || myRole === "OWNER";
                                    const expiry = expiryLabel(invitation.expiresAt, now);
                                    const actions: RowAction[] = [
                                        ...(!expiry.expired
                                            ? [{ label: "Copy invite link", icon: <Link2 />, copy: `/invite/${invitation.token}` }]
                                            : []),
                                        ...(canRevoke
                                            ? [
                                                  {
                                                      label: expiry.expired ? "Remove invitation" : "Cancel invitation",
                                                      icon: <Trash2 />,
                                                      danger: true,
                                                      run: revokeInvitationAction.bind(null, slug, invitation.id),
                                                      confirm: {
                                                          title: expiry.expired ? "Remove this invitation?" : "Cancel this invitation?",
                                                          description: expiry.expired
                                                              ? `The expired invitation for ${invitation.email} will be removed from the list.`
                                                              : `The link sent to ${invitation.email} will stop working.`,
                                                          confirmLabel: expiry.expired ? "Remove" : "Cancel invitation",
                                                          loadingLabel: "Working...",
                                                      },
                                                  },
                                              ]
                                            : []),
                                    ];

                                    return (
                                        <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5">
                                            <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                                                <span
                                                    aria-hidden="true"
                                                    className={`flex size-[38px] shrink-0 items-center justify-center rounded-full border border-dashed ${
                                                        expiry.expired ? "border-border text-muted-foreground/60" : "border-brand/40 text-brand"
                                                    }`}
                                                >
                                                    <Mail className="size-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className={`truncate text-sm font-medium ${expiry.expired ? "text-muted-foreground" : "text-foreground"}`}>
                                                        {invitation.email}
                                                    </p>
                                                    <p className="truncate text-[13px] text-muted-foreground">
                                                        {invitation.project
                                                            ? `${formatRole(invitation.projectRole ?? "VIEWER")} on ${invitation.project.name}`
                                                            : `Joins as ${formatRole(invitation.role)}`}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground/80">
                                                        {invitation.invitedBy
                                                            ? `Invited by ${invitation.invitedBy.name?.trim() || invitation.invitedBy.email} ${timeAgo(invitation.createdAt)}`
                                                            : `Sent ${timeAgo(invitation.createdAt)}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                                    expiry.expired
                                                        ? "bg-danger/10 text-danger"
                                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                                }`}
                                            >
                                                <Clock className="size-3" aria-hidden="true" />
                                                {expiry.text}
                                            </span>

                                            <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-[50px] sm:pl-0">
                                                <RolePill role={invitation.role} />
                                                {actions.length > 0 ? (
                                                    <RowActions label={`Actions for invitation to ${invitation.email}`} actions={actions} />
                                                ) : (
                                                    <span aria-hidden="true" className="w-8" />
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}
                </div>

                <RolesGuide
                    title="What each role can do"
                    roles={(["OWNER", "ADMIN", "MEMBER", "GUEST"] as const).map((role) => ({
                        role,
                        label: formatRole(role),
                        description: WORKSPACE_ROLE_DESCRIPTIONS[role],
                        dot: WORKSPACE_ROLE_DOTS[role],
                        count: members.filter((m) => m.role === role).length,
                        current: role === myRole,
                    }))}
                />
            </div>
        </PageBody>
    );
}
