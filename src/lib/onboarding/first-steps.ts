/** What someone has done so far, read from their data. */
export type FirstStepsProgress = {
    hasWorkspace: boolean;
    /** Another person is in, or has been invited to, one of their workspaces. */
    hasTeammate: boolean;
    hasProject: boolean;
    hasTask: boolean;
};

/** Where each step's button leads, worked out from their first workspace and project. */
export type FirstStepsLinks = {
    workspaceSlug: string | null;
    projectHref: string | null;
};

export type FirstStep = {
    id: "workspace" | "team" | "project" | "task";
    title: string;
    text: string;
    done: boolean;
    /** Where to do it. */
    href: string;
    action: string;
    /** The guide section that explains it. */
    guide: string;
};

/**
 * The four steps of the welcome card, in order. Each step's link only goes
 * somewhere useful once the step before it is possible (no "add a task"
 * without a project).
 */
export function firstSteps(progress: FirstStepsProgress, links: FirstStepsLinks): FirstStep[] {
    const workspace = links.workspaceSlug ? `/workspace/${links.workspaceSlug}` : null;

    return [
        {
            id: "workspace",
            title: "Create a workspace",
            text: "Your team's shared home for projects and people.",
            done: progress.hasWorkspace,
            href: "/workspace/new",
            action: "Create workspace",
            guide: "/guide#workspace",
        },
        {
            id: "team",
            title: "Invite a teammate",
            text: "Send an email invite with a role.",
            done: progress.hasTeammate,
            href: workspace ? `${workspace}/team` : "/workspace/new",
            action: "Invite people",
            guide: "/guide#team",
        },
        {
            id: "project",
            title: "Create a project",
            text: "Group the work for one goal, like a launch.",
            done: progress.hasProject,
            href: workspace ? `${workspace}/project/new` : "/workspace/new",
            action: "New project",
            guide: "/guide#projects",
        },
        {
            id: "task",
            title: "Add your first task",
            text: "Give it an owner and a due date, then move it across the board.",
            done: progress.hasTask,
            href: links.projectHref ?? (workspace ? `${workspace}/project/new` : "/workspace/new"),
            action: "Add a task",
            guide: "/guide#tasks",
        },
    ];
}

/** The card shows until every step is done (or it's dismissed). */
export function showFirstSteps(steps: FirstStep[], dismissed: boolean) {
    return !dismissed && steps.some((step) => !step.done);
}
