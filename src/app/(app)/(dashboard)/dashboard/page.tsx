import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { firstSteps, showFirstSteps } from "@/lib/onboarding/first-steps";
import { WELCOME_DISMISSED_COOKIE } from "@/lib/navigation/shell-cookies";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageBody } from "@/components/ui/PageBody";
import type { Focus, RecentProject } from "@/app/(app)/(dashboard)/dashboard/components/types";
import { groupByDue, myTasksWhere } from "@/lib/tasks/my-tasks";
import type { WorkspaceRoleName } from "@/lib/auth/permissions";
import { DashboardView } from "@/app/(app)/(dashboard)/dashboard/components/DashboardView";
import { pageTitle } from "@/lib/navigation/page-titles";



export default async function DashboardPage() {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }

    const memberships = await prisma.workspaceMember.findMany({
        where: { userId: session.user.id },
        orderBy: { workspace: { updatedAt: "desc" } },
        select: {
            role: true,
            workspace: {
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    description: true,
                    updatedAt: true,
                    _count: { select: { members: true } },
                },
            },
        },
    });

 
    const workspaceIds = memberships.map((m) => m.workspace.id);

    const ownerOrAdminWorkspaceIds = new Set(
        memberships
            .filter((m) => m.role === "OWNER" || m.role === "ADMIN")
            .map((m) => m.workspace.id),
    );

    const guestWorkspaceIds = new Set(
        memberships.filter((m) => m.role === "GUEST").map((m) => m.workspace.id),
    );

    const [allProjects, ownProjectMemberships] = workspaceIds.length
        ? await Promise.all([
            prisma.project.findMany({
                where: { workspaceId: { in: workspaceIds } },
                select: {
                    id: true,
                    workspaceId: true,
                    visibility: true,
                    updatedAt: true,
                },
            }),
            prisma.projectMember.findMany({
                where: { userId: session.user.id },
                select: { projectId: true },
            }),
        ])
        : [[], []];

    const explicitProjectIds = new Set(
        ownProjectMemberships.map((m) => m.projectId),
    );

    const accessibleProjectIds = new Set(
        allProjects
            .filter((project) => {
                if (ownerOrAdminWorkspaceIds.has(project.workspaceId)) return true;
                if (explicitProjectIds.has(project.id)) return true;
                return (
                    !guestWorkspaceIds.has(project.workspaceId) &&
                    project.visibility === "WORKSPACE"
                );
            })
            .map((project) => project.id),
    );

    const accessibleProjectCountByWorkspace = new Map<string, number>();
    for (const project of allProjects) {
        if (!accessibleProjectIds.has(project.id)) continue;
        accessibleProjectCountByWorkspace.set(
            project.workspaceId,
            (accessibleProjectCountByWorkspace.get(project.workspaceId) ?? 0) + 1,
        );
    }

    // Pick the five most recent displayable projects in memory, then fetch
    // full details for only those five (instead of an unbounded `IN` query).
    const recentIds = allProjects
        // Never surface private projects the user isn't on.
        .filter((project) => accessibleProjectIds.has(project.id))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5)
        .map((project) => project.id);

    const rawRecentProjects = recentIds.length
        ? await prisma.project.findMany({
            where: { id: { in: recentIds } },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                name: true,
                description: true,
                updatedAt: true,
                visibility: true,
                workspace: { select: { id: true, slug: true, name: true } },
            },
        })
        : [];

    const recentProjects: RecentProject[] = rawRecentProjects.map((project) => ({
        ...project,
        isLocked:
            project.visibility === "PRIVATE" &&
            !accessibleProjectIds.has(project.id),
    }));

    // Tasks assigned to the user that are still open, for the focus panel.
    const myTasks = memberships.length
        ? await prisma.task.findMany({
              where: myTasksWhere(
                  session.user.id,
                  memberships.map((m) => ({
                      workspaceId: m.workspace.id,
                      role: m.role as WorkspaceRoleName,
                  })),
              ),
              take: 200,
              select: {
                  id: true,
                  title: true,
                  status: true,
                  priority: true,
                  dueDate: true,
                  project: {
                      select: { id: true, name: true, workspace: { select: { slug: true } } },
                  },
              },
          })
        : [];

    const now = new Date();
    const groups = groupByDue(myTasks, now);
    const dueLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const focus: Focus = {
        overdue: groups.overdue.length,
        today: groups.today.length,
        week: groups.week.length,
        upNext: [...groups.overdue, ...groups.today, ...groups.week, ...groups.later, ...groups.none]
            .slice(0, 5)
            .map((task) => ({
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                dueLabel: task.dueDate ? dueLabel.format(task.dueDate) : null,
                overdue: groups.overdue.includes(task),
                href: `/workspace/${task.project.workspace.slug}/project/${task.project.id}/tasks/${task.id}`,
                project: { id: task.project.id, name: task.project.name },
            })),
    };

    // The welcome checklist, from what this person has done so far.
    const managedIds = [...ownerOrAdminWorkspaceIds];
    const [firstTask, pendingInvite, cookieStore] = await Promise.all([
        accessibleProjectIds.size
            ? prisma.task.findFirst({ where: { projectId: { in: [...accessibleProjectIds] } }, select: { id: true } })
            : null,
        managedIds.length
            ? prisma.invitation.findFirst({ where: { workspaceId: { in: managedIds }, acceptedAt: null }, select: { id: true } })
            : null,
        cookies(),
    ]);
    const firstWorkspace = memberships[0]?.workspace ?? null;
    const steps = firstSteps(
        {
            hasWorkspace: memberships.length > 0,
            hasTeammate: memberships.some((m) => m.workspace._count.members > 1) || Boolean(pendingInvite),
            hasProject: accessibleProjectIds.size > 0,
            hasTask: Boolean(firstTask),
        },
        {
            workspaceSlug: firstWorkspace?.slug ?? null,
            projectHref: rawRecentProjects[0]
                ? `/workspace/${rawRecentProjects[0].workspace.slug}/project/${rawRecentProjects[0].id}`
                : null,
        },
    );
    const welcome = showFirstSteps(steps, cookieStore.get(WELCOME_DISMISSED_COOKIE)?.value === "1") ? steps : null;

    return (
        <PageBody glow="#4b3fd9">
            <DashboardView
                focus={focus}
                session={session}
                memberships={memberships}
                recentProjects={recentProjects}
                accessibleProjectCountByWorkspace={accessibleProjectCountByWorkspace}
                totalAccessibleProjectCount={accessibleProjectIds.size}
                welcome={welcome}
            />
        </PageBody>
    );
}

export const metadata = pageTitle("Home");
