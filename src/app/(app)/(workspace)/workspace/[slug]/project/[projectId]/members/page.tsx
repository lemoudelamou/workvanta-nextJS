import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Lock, UserMinus, UserPlus } from "lucide-react";

import { requireProjectAccess, type ProjectAccessResult } from "@/lib/auth/members";
import {
    canProject,
    effectiveProjectRole,
    isWorkspaceManager,
    PROJECT_ROLE_DESCRIPTIONS,
    type ProjectRoleName,
    type WorkspaceRoleName,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { projectDot } from "@/lib/navigation/project-color";

import { removeProjectMemberAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/member-actions";
import { InviteProjectMemberForm } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/invite-project-member-form";
import { ProjectMemberRoleSelect } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/members/role-select";

import { Breadcrumb } from "@/components/ui/BreadCrumb";
import { PageBody } from "@/components/ui/PageBody";
import { AccessDeniedNotice } from "@/components/ui/AccessDenied";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { RowActions } from "@/components/ui/RowActions";
import { RolesGuide } from "@/components/ui/RolesGuide";
import { SearchableList } from "@/components/ui/SearchableList";
import { projectTitle } from "@/lib/navigation/page-titles";

const ROLE_RANK: Record<ProjectRoleName, number> = { ADMIN: 0, EDITOR: 1, VIEWER: 2 };

const PROJECT_ROLE_DOTS: Record<ProjectRoleName, string> = {
    ADMIN: "bg-brand",
    EDITOR: "bg-status-done",
    VIEWER: "bg-muted-foreground/60",
};

function formatRole(role: string) {
    return role.charAt(0) + role.slice(1).toLowerCase();
}

/** Why someone can open the project. */
function accessSource(workspaceRole: WorkspaceRoleName, hasProjectRole: boolean) {
    if (workspaceRole === "OWNER") return "Workspace owner";
    if (workspaceRole === "ADMIN") return "Workspace admin";
    if (hasProjectRole) return "Added to this project";
    return "Everyone in the workspace";
}

const card =
    "overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(23,26,33,0.04),0_8px_24px_-16px_rgba(23,26,33,0.12)]";

export default async function ProjectMembersPage({ params }: { params: Promise<{ slug: string; projectId: string }> }) {
    const { slug, projectId } = await params;

    let access: ProjectAccessResult;
    try {
        access = await requireProjectAccess(slug, projectId);
    } catch (error) {
        const digest = (error as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw error;
        if (error instanceof Error && error.message === "Project not found.") notFound();
        return (
            <AccessDeniedNotice
                workspaceSlug={slug}
                message={error instanceof Error ? error.message : "Something went wrong loading this project."}
            />
        );
    }

    const isProjectAdmin = canProject(access.effectiveRole, "project.members.manage");
    const isWorkspaceAdmin = isWorkspaceManager(access.workspaceRole);
    const isPrivate = access.project.visibility === "PRIVATE";

    const [projectMembers, workspaceMembers] = await Promise.all([
        prisma.projectMember.findMany({
            where: { projectId: access.project.id },
            select: { id: true, userId: true, role: true },
        }),
        prisma.workspaceMember.findMany({
            where: { workspaceId: access.workspace.id },
            orderBy: { createdAt: "asc" },
            select: {
                userId: true,
                role: true,
                user: { select: { id: true, name: true, email: true, image: true } },
            },
        }),
    ]);
    const projectRoleOf = new Map(projectMembers.map((m) => [m.userId, m]));

    // Everyone who can open this project, and why.
    const people = workspaceMembers
        .map((wm) => {
            const workspaceRole = wm.role as WorkspaceRoleName;
            const explicit = projectRoleOf.get(wm.userId);
            const role = effectiveProjectRole({
                workspaceRole,
                projectRole: (explicit?.role as ProjectRoleName | undefined) ?? null,
                visibility: access.project.visibility,
            });
            return role ? { ...wm, workspaceRole, explicit, role } : null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || (a.user.name ?? a.user.email).localeCompare(b.user.name ?? b.user.email));

    const addedCount = people.filter((p) => p.explicit).length;
    const projectHref = `/workspace/${slug}/project/${projectId}`;

    return (
        <PageBody>
            <Breadcrumb
                items={[
                    { label: access.workspace.name, href: `/workspace/${slug}`, truncate: true },
                    { label: access.project.name, href: projectHref, truncate: true },
                    { label: "Members" },
                ]}
            />

            <header className="mt-4">
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span aria-hidden="true" className={`size-2.5 rounded-[3px] ${projectDot(projectId)}`} />
                    {access.project.name}
                </p>
                <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">Members & access</h1>
            </header>

            <div
                className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
                    isPrivate ? "border-amber-500/30 bg-amber-500/[0.07]" : "border-border bg-card"
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                        isPrivate ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-brand-soft text-brand dark:bg-brand/15"
                    }`}
                >
                    {isPrivate ? <Lock className="size-4" /> : <Globe className="size-4" />}
                </span>
                <p className="leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground">{isPrivate ? "Private project. " : "Shared with the workspace. "}</span>
                    {isPrivate
                        ? `Only people added here, plus ${access.workspace.name}'s owners and admins, can open it.`
                        : `Everyone in ${access.workspace.name} except guests can open and edit it. Add someone with a role to give a guest access or to make someone view-only.`}{" "}
                    <Link href={projectHref} className="font-medium text-brand hover:underline">
                        Change in project settings
                    </Link>
                </p>
            </div>

            <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-6">
                    {isProjectAdmin && (
                        <section aria-labelledby="add-member" className={`${card} p-5 sm:p-6`}>
                            <div className="flex items-center gap-3">
                                <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand dark:bg-brand/15">
                                    <UserPlus className="size-[18px]" />
                                </span>
                                <div>
                                    <h2 id="add-member" className="text-[15px] font-semibold text-foreground">
                                        Add people
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Someone already here? Add their email to change their role on this project.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <InviteProjectMemberForm slug={slug} projectId={projectId} />
                            </div>
                        </section>
                    )}

                    <section aria-labelledby="with-access" className={card}>
                        <SearchableList
                            count={people.length}
                            placeholder="Search people"
                            header={
                                <h2 id="with-access" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                                    People with access
                                    <span className="rounded-full bg-muted px-2 text-xs font-medium leading-5 tabular-nums text-muted-foreground">
                                        {people.length}
                                    </span>
                                </h2>
                            }
                        >
                            <ul className="divide-y divide-border border-t border-border">
                                {people.map((person) => {
                                    const isCurrentUser = person.userId === access.userId;
                                    const displayName = person.user.name ?? person.user.email;
                                    // Project admins can't edit their own row (that's how a project ends up
                                    // with no admin); workspace owners/admins keep admin rights regardless.
                                    const canManage =
                                        !!person.explicit &&
                                        !isWorkspaceManager(person.workspaceRole) &&
                                        isProjectAdmin &&
                                        (!isCurrentUser || isWorkspaceAdmin);

                                    return (
                                        <li
                                            key={person.userId}
                                            data-search={`${person.user.name ?? ""} ${person.user.email} ${person.role}`}
                                            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5"
                                        >
                                            <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                                                <PersonAvatar person={person.user} size={38} />
                                                <div className="min-w-0">
                                                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                        <span className="truncate">{displayName}</span>
                                                        {isCurrentUser && <span className="shrink-0 text-xs font-normal text-muted-foreground">(you)</span>}
                                                    </p>
                                                    <p className="truncate text-[13px] text-muted-foreground">{person.user.email}</p>
                                                </div>
                                            </div>

                                            <span className="hidden w-44 shrink-0 text-xs text-muted-foreground lg:block">
                                                {accessSource(person.workspaceRole, !!person.explicit)}
                                            </span>

                                            <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-[50px] sm:pl-0">
                                                {canManage ? (
                                                    <ProjectMemberRoleSelect
                                                        slug={slug}
                                                        projectId={projectId}
                                                        memberId={person.explicit!.id}
                                                        currentRole={person.explicit!.role as ProjectRoleName}
                                                    />
                                                ) : (
                                                    <span
                                                        title={accessSource(person.workspaceRole, !!person.explicit)}
                                                        className="inline-flex h-8 items-center gap-2 rounded-full bg-foreground/[0.05] px-3 text-[13px] font-medium text-foreground ring-1 ring-inset ring-foreground/10"
                                                    >
                                                        <span aria-hidden="true" className={`size-2 rounded-full ${PROJECT_ROLE_DOTS[person.role]}`} />
                                                        {formatRole(person.role)}
                                                    </span>
                                                )}
                                                {canManage && !isCurrentUser ? (
                                                    <RowActions
                                                        label={`Actions for ${displayName}`}
                                                        actions={[
                                                            {
                                                                label: "Remove from project",
                                                                icon: <UserMinus />,
                                                                danger: true,
                                                                run: removeProjectMemberAction.bind(null, slug, projectId, person.explicit!.id),
                                                                confirm: {
                                                                    title: `Remove ${displayName} from ${access.project.name}?`,
                                                                    description: isPrivate || person.workspaceRole === "GUEST"
                                                                        ? "They'll no longer be able to open this project."
                                                                        : "Their project role is removed. As a workspace member they can still open and edit it.",
                                                                    confirmLabel: "Remove",
                                                                    loadingLabel: "Removing...",
                                                                },
                                                            },
                                                        ]}
                                                    />
                                                ) : (
                                                    <span aria-hidden="true" className="w-8" />
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </SearchableList>
                        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
                            {addedCount} added to this project directly, {people.length - addedCount} through the workspace.
                        </p>
                    </section>
                </div>

                <RolesGuide
                    title="Project roles"
                    roles={(["ADMIN", "EDITOR", "VIEWER"] as const).map((role) => ({
                        role,
                        label: formatRole(role),
                        description: PROJECT_ROLE_DESCRIPTIONS[role],
                        dot: PROJECT_ROLE_DOTS[role],
                        count: people.filter((p) => p.role === role).length,
                        current: role === access.effectiveRole,
                    }))}
                    footer="Workspace owners and admins are always admins of every project."
                />
            </div>
        </PageBody>
    );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; projectId: string }> }) {
    const { slug, projectId } = await params;
    return projectTitle(slug, projectId, "Members");
}
