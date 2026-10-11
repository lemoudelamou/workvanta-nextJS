import { ShieldCheck, Trash2, UserPlus, UsersRound, Crown } from "lucide-react";

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

const ROLE_RANK: Record<string, number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
    GUEST: 3,
};

const ROLE_HELPER: Record<string, string> = {
    OWNER: "Full access",
    ADMIN: "Manage members and projects",
    MEMBER: "Create and edit projects",
    GUEST: "Invited projects only",
};

const JOINED = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

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
    "grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-3";



export default async function TeamPage({
                                           params,
                                       }: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const membership = await requireMembership(slug);
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

    const isOwner = membership.role === "OWNER";
    const isAdmin = membership.role === "ADMIN";
    const canInvite = isOwner || isAdmin;
    const canManageRoles = isOwner;
    const canRemoveMembers = isOwner || isAdmin;

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
                    helper={ROLE_HELPER[membership.role]}
                />
            </section>

            {canInvite && (
                <section
                    aria-labelledby="invite"
                    className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
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
                        <InviteTeamForm slug={slug} canInviteAdmin={isOwner} />
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

                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    {members.map((member) => {
                        const isCurrentUser = member.userId === membership.userId;
                        const isTargetOwner = member.role === "OWNER";

                        const canChangeThisRole =
                            canManageRoles && !isCurrentUser && !isTargetOwner;
                        const canRemoveThisMember =
                            canRemoveMembers &&
                            !isCurrentUser &&
                            !isTargetOwner &&
                            !(isAdmin && member.role !== "MEMBER");

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
        </PageBody>
    );
}