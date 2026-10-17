/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";

import ProjectPage from "./page";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listProjectAudience, requireProjectAccess } from "@/lib/auth/members";
import { canEditTasks } from "@/lib/auth/task_permission";
import { prisma } from "@/lib/db/prisma";
import { setProjectVisibilityAction } from "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions";

// ---------- module mocks ----------
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));


jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/members", () => ({
    requireProjectAccess: jest.fn(),
    listProjectAudience: jest.fn(),
}));
jest.mock("@/lib/auth/task_permission", () => ({ canEditTasks: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: {
        project: { findUniqueOrThrow: jest.fn() },
        projectMember: { count: jest.fn() },
        task: { findMany: jest.fn() },
        workspaceMember: { findMany: jest.fn() },
        label: { findMany: jest.fn().mockResolvedValue([]) },
    },
}));

jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions",
    () => {
        const updateProjectDetailsAction: any = jest.fn();
        updateProjectDetailsAction.bind = jest.fn(() => "bound-update-details");
        return { setProjectVisibilityAction: jest.fn(), updateProjectDetailsAction };
    },
);
jest.mock("./components/ProjectActions", () => ({
    ProjectActions: ({ project, membersHref, updateDetails, setVisibility, canDelete }: any) => (
        <div data-testid="project-actions" data-members={membersHref}>
            {updateDetails && <span data-testid="edit-details">{String(updateDetails)}</span>}
            {setVisibility && (
                <button data-testid="toggle-visibility" onClick={() => setVisibility("WORKSPACE")}>
                    {project.visibility}
                </button>
            )}
            {canDelete && <span data-testid="delete-project">Delete {project.name}</span>}
        </div>
    ),
}));
jest.mock("./components/StatusRail", () => ({
    StatusRail: ({ counts, overdue, dueSoon, unassigned }: any) => (
        <div data-testid="rail">
            <span data-testid="rail-counts">
                {`${counts.TODO}/${counts.IN_PROGRESS}/${counts.IN_REVIEW}/${counts.DONE}`}
            </span>
            <span data-testid="rail-overdue">{overdue}</span>
            <span data-testid="rail-due-soon">{dueSoon}</span>
            <span data-testid="rail-unassigned">{unassigned}</span>
        </div>
    ),
}));
jest.mock("@/components/ui/PageBody", () => ({
    PageBody: ({ children }: any) => <main>{children}</main>,
}));
jest.mock("@/components/ui/BreadCrumb", () => ({
    Breadcrumb: ({ items }: any) => (
        <nav data-testid="breadcrumb">
            {items.map((i: any) => i.label).join(" > ")}
        </nav>
    ),
}));
jest.mock("@/components/ui/AccessDenied", () => ({
    AccessDeniedNotice: ({ message }: any) => (
        <div data-testid="access-denied">{message}</div>
    ),
}));
// Capture the props passed to the board so we can assert on them.
// The `mock` prefix is required for variables used inside jest.mock factories.
let mockListProps: any;
let mockBoardProps: any;
jest.mock("./listview/project-list-view", () => ({
    ProjectListView: (props: any) => {
        mockListProps = props;
        return <div data-testid="list-view">{props.leading}</div>;
    },
}));
jest.mock("./kanbanboard/kanban-board", () => ({
    KanbanBoard: (props: any) => {
        mockBoardProps = props;
        return <div data-testid="kanban-board">{props.leading}</div>;
    },
}));

// ---------- typed handles ----------
const mockNotFound = notFound as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockRequireProjectAccess = requireProjectAccess as jest.Mock;
const mockCanEditTasks = canEditTasks as jest.Mock;
const mockSetVisibility = setProjectVisibilityAction as unknown as jest.Mock;
const db = prisma as unknown as {
    project: { findUniqueOrThrow: jest.Mock };
    projectMember: { count: jest.Mock };
    task: { findMany: jest.Mock };
    workspaceMember: { findMany: jest.Mock };
};

const mockListProjectAudience = listProjectAudience as jest.Mock;

// ---------- helpers ----------
const NOW = new Date("2026-10-16T12:00:00Z");

function makeAccess(overrides: Record<string, unknown> = {}) {
    return {
        project: { id: "p1" },
        workspaceRole: "MEMBER",
        projectRole: null,
        effectiveRole: "EDITOR",
        ...overrides,
    };
}

function makeTask(overrides: Record<string, unknown> = {}) {
    return {
        id: "t1",
        title: "Task",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: null,
        assignee: null,
        subtasks: [],
        labels: [],
        ...overrides,
    };
}

async function renderPage(query: { view?: string } = {}) {
    const ui = await ProjectPage({
        params: Promise.resolve({ slug: "acme", projectId: "p1" }),
        searchParams: Promise.resolve(query),
    });
    return render(ui);
}

beforeEach(() => {
    (prisma as any).label.findMany.mockResolvedValue([]);
    // Only fake Date; leave timers/microtasks alone so awaits keep working
    jest.useFakeTimers({
        now: NOW,
        doNotFake: [
            "nextTick",
            "setImmediate",
            "clearImmediate",
            "setTimeout",
            "clearTimeout",
            "setInterval",
            "clearInterval",
            "queueMicrotask",
        ],
    });
    mockBoardProps = undefined;

    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mockRequireProjectAccess.mockResolvedValue(makeAccess());
    mockCanEditTasks.mockReturnValue(false);

    db.project.findUniqueOrThrow.mockResolvedValue({
        id: "p1",
        name: "Apollo",
        description: "Moon landing",
        visibility: "PRIVATE",
        workspaceId: "w1",
        workspace: { slug: "acme", name: "Acme Inc" },
    });
    db.projectMember.count.mockResolvedValue(3);
    db.task.findMany.mockResolvedValue([]);
    db.workspaceMember.findMany.mockResolvedValue([]);
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks(); // clears calls but keeps the notFound throw implementation
});

// ---------- tests ----------
describe("ProjectPage – access handling", () => {
    it("calls notFound when the project does not exist", async () => {
        mockRequireProjectAccess.mockRejectedValue(new Error("Project not found."));

        await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
    });

    it("re-throws Next.js redirect errors", async () => {
        const redirectError = Object.assign(new Error("redirect"), {
            digest: "NEXT_REDIRECT;replace;/login;307;",
        });
        mockRequireProjectAccess.mockRejectedValue(redirectError);

        await expect(renderPage()).rejects.toBe(redirectError);
        expect(mockNotFound).not.toHaveBeenCalled();
    });

    it("shows the access denied notice with the error message", async () => {
        mockRequireProjectAccess.mockRejectedValue(new Error("No access to project."));

        await renderPage();

        expect(screen.getByTestId("access-denied")).toHaveTextContent(
            "No access to project.",
        );
        expect(db.project.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it("falls back to a generic message for non-Error throws", async () => {
        mockRequireProjectAccess.mockRejectedValue("boom");

        await renderPage();

        expect(screen.getByTestId("access-denied")).toHaveTextContent(
            "Something went wrong loading this project.",
        );
    });

    it("calls notFound when there is no session user", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
    });
});

describe("ProjectPage – header", () => {
    it("renders the project name, description and breadcrumb", async () => {
        await renderPage();

        expect(screen.getByRole("heading", { level: 1, name: "Apollo" })).toBeInTheDocument();
        expect(screen.getByText("Private")).toBeInTheDocument();
        expect(screen.getByTestId("description")).toHaveTextContent("Moon landing");
        expect(screen.getByTestId("breadcrumb")).toHaveTextContent("Acme Inc > Apollo");
    });

    it("uses the default description when the project has none", async () => {
        db.project.findUniqueOrThrow.mockResolvedValue({
            id: "p1",
            name: "Apollo",
            description: null,
            visibility: "PRIVATE",
            workspaceId: "w1",
            workspace: { slug: "acme", name: "Acme Inc" },
        });

        await renderPage();

        expect(screen.getByTestId("description")).toHaveTextContent(
            "Track tasks from to-do to done",
        );
    });

    it("links to the members page", async () => {
        await renderPage();

        expect(screen.getByRole("link", { name: /members/i })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1/members",
        );
    });
});

describe("ProjectPage – status rail", () => {
    it("passes per-status counts and what needs attention", async () => {
        db.task.findMany.mockResolvedValue([
            makeTask({ id: "1", status: "DONE", dueDate: new Date("2026-10-17T00:00:00Z") }),
            makeTask({ id: "2", status: "IN_PROGRESS", assignee: { name: "A", email: "a@x.com", image: null } }),
            makeTask({ id: "3", status: "IN_REVIEW", dueDate: new Date("2026-10-20T00:00:00Z") }),
            makeTask({ id: "4", status: "TODO", dueDate: new Date("2026-10-01T00:00:00Z") }),
            makeTask({ id: "5", status: "TODO", dueDate: new Date("2026-11-30T00:00:00Z") }),
        ]);

        await renderPage();

        expect(screen.getByTestId("rail-counts")).toHaveTextContent("2/1/1/1");
        expect(screen.getByTestId("rail-overdue")).toHaveTextContent("1");
        // Only open tasks due within seven days count; done ones never do.
        expect(screen.getByTestId("rail-due-soon")).toHaveTextContent("1");
        expect(screen.getByTestId("rail-unassigned")).toHaveTextContent("3");
    });

    it("passes zeros when there are no tasks", async () => {
        await renderPage();

        expect(screen.getByTestId("rail-counts")).toHaveTextContent("0/0/0/0");
        expect(screen.getByTestId("rail-overdue")).toHaveTextContent("0");
    });
});

describe("ProjectPage – board tasks", () => {
    it("maps tasks into board tasks with due labels and subtask counts", async () => {
        const assignee = { name: "Ada", email: "ada@x.com", image: null };
        db.task.findMany.mockResolvedValue([
            makeTask({
                id: "1",
                title: "Ship it",
                status: "IN_PROGRESS",
                priority: "HIGH",
                dueDate: new Date("2026-10-20T00:00:00Z"),
                assignee,
                subtasks: [{ completed: true }, { completed: false }, { completed: true }],
            }),
        ]);

        await renderPage();

        expect(mockBoardProps.slug).toBe("acme");
        expect(mockBoardProps.projectId).toBe("p1");
        expect(mockBoardProps.tasks).toEqual([
            {
                id: "1",
                title: "Ship it",
                status: "IN_PROGRESS",
                priority: "HIGH",
                dueLabel: "Oct 20",
                dueAt: "2026-10-20T00:00:00.000Z",
                overdue: false,
                assignee,
                subtaskTotal: 3,
                subtaskDone: 2,
                labels: [],
            },
        ]);
    });

    it("gives the board each task's labels, sorted, and the project's labels for filtering", async () => {
        const bug = { id: "l1", name: "Bug", color: "red" };
        const api = { id: "l2", name: "api", color: "blue" };
        db.task.findMany.mockResolvedValue([makeTask({ labels: [{ label: bug }, { label: api }] })]);
        (prisma as any).label.findMany.mockResolvedValue([
            { ...api, _count: { tasks: 1 } },
            { ...bug, _count: { tasks: 1 } },
        ]);

        await renderPage();

        expect(mockBoardProps.tasks[0].labels).toEqual([api, bug]);
        expect(mockBoardProps.labels).toEqual([api, bug]);
        expect((prisma as any).label.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: "p1" } }));
    });

    it("has a null due label and is not overdue without a due date", async () => {
        db.task.findMany.mockResolvedValue([makeTask()]);

        await renderPage();

        expect(mockBoardProps.tasks[0].dueLabel).toBeNull();
        expect(mockBoardProps.tasks[0].overdue).toBe(false);
    });

    it("never marks DONE tasks as overdue", async () => {
        db.task.findMany.mockResolvedValue([
            makeTask({ status: "DONE", dueDate: new Date("2026-01-01T00:00:00Z") }),
        ]);

        await renderPage();

        expect(mockBoardProps.tasks[0].overdue).toBe(false);
        expect(screen.getByTestId("rail-overdue")).toHaveTextContent("0");
    });

    it("queries tasks ordered by position then createdAt", async () => {
        await renderPage();

        expect(db.task.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { projectId: "p1" },
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            }),
        );
    });
});

describe("ProjectPage – permissions", () => {
    it("does not load assignable members when the user cannot edit", async () => {
        mockCanEditTasks.mockReturnValue(false);

        await renderPage();

        expect(mockListProjectAudience).not.toHaveBeenCalled();
        expect(mockBoardProps.canEdit).toBe(false);
        expect(mockBoardProps.members).toEqual([]);
    });

    it("does not load the project audience when the user cannot edit", async () => {
        mockCanEditTasks.mockReturnValue(false);

        await renderPage();

        expect(mockListProjectAudience).not.toHaveBeenCalled();
    });

    it("only offers people who can open the project as assignees", async () => {
        const user = { id: "u2", name: "Grace", email: "g@x.com" };
        mockCanEditTasks.mockReturnValue(true);
        mockListProjectAudience.mockResolvedValue([{ ...user, image: null }]);

        await renderPage();

        expect(mockListProjectAudience).toHaveBeenCalledWith(
            expect.objectContaining({ id: "p1", workspaceId: "w1" }),
        );
        expect(mockBoardProps.canEdit).toBe(true);
        expect(mockBoardProps.members).toEqual([user]);
    });

    it.each([
        ["workspace OWNER", { workspaceRole: "OWNER", projectRole: null, effectiveRole: "ADMIN" }],
        ["workspace ADMIN", { workspaceRole: "ADMIN", projectRole: null, effectiveRole: "ADMIN" }],
        ["project ADMIN", { workspaceRole: "MEMBER", projectRole: "ADMIN", effectiveRole: "ADMIN" }],
    ])("shows admin controls for a %s", async (_label, roles) => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess(roles));

        await renderPage();

        expect(screen.getByTestId("toggle-visibility")).toHaveTextContent("PRIVATE");
        expect(screen.getByTestId("delete-project")).toHaveTextContent("Delete Apollo");
    });

    it("hides admin controls for regular members", async () => {
        await renderPage();

        expect(screen.queryByTestId("toggle-visibility")).not.toBeInTheDocument();
        expect(screen.queryByTestId("delete-project")).not.toBeInTheDocument();
        // Everyone still gets the menu, with the members link.
        expect(screen.getByTestId("project-actions")).toHaveAttribute("data-members", "/workspace/acme/project/p1/members");
    });

    it("binds the visibility action to the workspace slug and project id", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ workspaceRole: "OWNER", effectiveRole: "ADMIN" }));

        await renderPage();
        fireEvent.click(screen.getByTestId("toggle-visibility"));

        expect(mockSetVisibility).toHaveBeenCalledWith("acme", "p1", "WORKSPACE");
    });
});

describe("ProjectPage – edit details", () => {
    it("lets project admins edit the name and description", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ effectiveRole: "ADMIN" }));

        await renderPage();

        expect(screen.getByTestId("edit-details")).toHaveTextContent("bound-update-details");
    });

    it("hides the edit panel from editors", async () => {
        await renderPage();

        expect(screen.queryByTestId("edit-details")).not.toBeInTheDocument();
    });
});


describe("ProjectPage – views", () => {
    it("shows the board by default and marks it as the current view", async () => {
        await renderPage();

        expect(screen.getByTestId("kanban-board")).toBeInTheDocument();
        expect(screen.queryByTestId("list-view")).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "List" })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1?view=list",
        );
    });

    it("shows the list with the same tasks and permissions when asked", async () => {
        mockCanEditTasks.mockReturnValue(true);

        await renderPage({ view: "list" });

        expect(screen.getByTestId("list-view")).toBeInTheDocument();
        expect(screen.queryByTestId("kanban-board")).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "page");
        expect(mockListProps).toMatchObject({ slug: "acme", projectId: "p1", canEdit: true });
    });
});
