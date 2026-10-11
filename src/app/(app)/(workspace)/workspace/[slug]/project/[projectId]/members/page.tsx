import { notFound } from "next/navigation";
import { Crown, Eye, Lock, Trash2, UserPlus, UsersRound } from "lucide-react";

import { requireProjectAccess, type ProjectAccessResult } from "@/lib/auth/members";
import { prisma } from "@/lib/db/prisma";
import { accentFor, accentVars } from "@/lib/accent";

import { removeProjectMemberAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions";
import { InviteProjectMemberForm } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/invite-project-member-form";
import { ProjectMemberRoleSelect } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/role-select";

import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { AccessDeniedNotice } from "@/components/ui/AccessDenied";
import { buttonStyles } from "@/app/style/button-style";
import { Kpi } from "@/app/style/Kpi";

const ROLE_RANK: Record<string, number> = {
    ADMIN: 0,
    EDITOR: 1,
    VIEWER: 2,
};

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
});

const KPI_STRIP =
    "grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-3";

function getInitials(name: string | null, email: string) {
    const value = name?.trim() || email;
    const parts = value.split(/\s+/).filter(Boolean);

    if (parts.length > 1) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return value.slice(0, 2).toUpperCase();
}

export default async function ProjectMembersPage({
                                                     params,
                                                 }: {
    params: Promise<{ slug: string; projectId: string }>;
}) {
    const { slug, projectId } = await params;

    let access: ProjectAccessResult;

    try {
        access = await requireProjectAccess(slug, projectId);
    } catch (error) {
        const digest = (error as { digest?: string })?.digest;

        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
            throw error;
        }

        if (error instanceof Error && error.message === "Project not found.") {
            notFound();
        }

        return (
            <AccessDeniedNotice
                workspaceSlug={slug}
                message={
                    error instanceof Error
                        ? error.message
                        : "Something went wrong loading this project."
                }
            />
        );
    }

    const isProjectAdmin =
        access.workspaceRole === "OWNER" ||
        access.workspaceRole === "ADMIN" ||
        access.projectRole === "ADMIN";

    const members = await prisma.projectMember.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            userId: true,
            role: true,
            createdAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                },
            },
        },
    });

    const sortedMembers = [...members].sort(
        (a, b) => (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99),
    );

    const isPrivate = access.project.visibility === "PRIVATE";
    const adminCount = sortedMembers.filter(
        (member) => member.role === "ADMIN",
    ).length;

    return (
        <PageBody>
            <Breadcrumb
                items={[
                    {
                        label: "Workspace",
                        href: `/workspace/${slug}`,
                    },
                    {
                        label: access.project.name,
                        href: `/workspace/${slug}/project/${projectId}`,
                        truncate: true,
                    },
                    {
                        label: "Members",
                    },
                ]}
            />

            <PageHeader
                eyebrow={access.project.name}
                title="Project members"
                description={
                    isPrivate
                        ? "This project is private. Only the people listed here can open it."
                        : "Everyone in the workspace can open this project. Add people here to give them a specific role."
                }
            />

            <section
                aria-label="Members summary"
                className={`mt-8 ${KPI_STRIP}`}
            >
                <Kpi
                    tone="blue"
                    icon={<UsersRound />}
                    label="Members"
                    value={sortedMembers.length}
                    helper="Added to this project"
                />

                <Kpi
                    tone="violet"
                    icon={<Crown />}
                    label="Project admins"
                    value={adminCount}
                    helper="Can manage members"
                />

                <Kpi
                    tone="amber"
                    icon={isPrivate ? <Lock /> : <Eye />}
                    label="Access"
                    value={isPrivate ? "Private" : "Workspace"}
                    helper={
                        isPrivate
                            ? "Invited people only"
                            : "Open to the whole workspace"
                    }
                />
            </section>

            {isProjectAdmin && (
                <section
                    aria-labelledby="add-member"
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
                                id="add-member"
                                className="text-lg font-semibold tracking-tight text-foreground"
                            >
                                Add a member
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Give someone access to this project and choose
                                what they can do.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <InviteProjectMemberForm
                            slug={slug}
                            projectId={projectId}
                        />
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
                            {sortedMembers.length}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                        People with a role on this project.
                    </p>
                </div>

                {sortedMembers.length === 0 ? (
                    <EmptyState
                        className="rounded-2xl border border-dashed border-border"
                        icon={<UsersRound />}
                        title="No one has been added yet"
                        description={
                            isProjectAdmin
                                ? "Add people above to give them access to this project."
                                : "A project admin can add people to this project."
                        }
                    />
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        {sortedMembers.map((member) => {
                            const isCurrentUser =
                                member.userId === access.userId;
                            const canManage =
                                isProjectAdmin && !isCurrentUser;
                            const displayName =
                                member.user.name ?? member.user.email;

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
                                                style={accentVars(
                                                    accentFor(member.user.id),
                                                )}
                                                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.14)] text-xs font-semibold text-[rgb(var(--accent))]"
                                            >
                                                {getInitials(
                                                    member.user.name,
                                                    member.user.email,
                                                )}
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
                                        Added{" "}
                                        {DATE_FORMAT.format(member.createdAt)}
                                    </time>

                                    <div className="flex flex-wrap items-center gap-2 pl-[3.375rem] sm:justify-end sm:pl-0">
                                        {canManage ? (
                                            <ProjectMemberRoleSelect
                                                slug={slug}
                                                projectId={projectId}
                                                memberId={member.id}
                                                currentRole={
                                                    member.role as
                                                        | "ADMIN"
                                                        | "EDITOR"
                                                        | "VIEWER"
                                                }
                                            />
                                        ) : (
                                            <RoleBadge role={member.role} />
                                        )}

                                        {canManage && (
                                            <form action={removeProjectMemberAction.bind(
                                                null,
                                                slug,
                                                projectId,
                                                member.id,
                                            )}
                                            >
                                                <button
                                                    type="submit"
                                                    title={`Remove ${displayName}`}
                                                    aria-label={`Remove ${displayName}`}
                                                    className={buttonStyles({
                                                        variant: "danger",
                                                        size: "sm",
                                                    })}>
                                                    <Trash2 className="size-3.5" aria-hidden="true"/>
                                                    Remove
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </PageBody>
    );
}
