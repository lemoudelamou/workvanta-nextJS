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
jest.mock("lucide-react", () => ({
    AlarmClock: () => null,
    Clock3: () => null,
    ListTodo: () => null,
    TriangleAlert: () => null,
    User: () => null,
    UsersRound: () => null,
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
    },
}));

jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/project-actions",
    () => ({ setProjectVisibilityAction: jest.fn() }),
);
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/components/DeleteProjectButton",
    () => ({
        DeleteProjectButton: ({ projectName }: any) => (
            <button data-testid="delete-project">Delete {projectName}</button>
        ),
    }),
);
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/project/[projectId]/components/ProgressBar",
    () => ({
        ProgressBar: ({ done, total, percent }: any) => (
            <div data-testid="progress">{`${done}/${total}/${percent}`}</div>
        ),
    }),
);
jest.mock("@/components/ui/ToggleVisibilityButton", () => ({
    ToggleVisibilityButton: ({ visibility, onToggle }: any) => (
        <button data-testid="toggle-visibility" onClick={() => onToggle()}>
            {visibility}
        </button>
    ),
}));
jest.mock("@/components/ui/PageBody", () => ({
    PageBody: ({ children }: any) => <main>{children}</main>,
}));
jest.mock("@/components/ui/PageHeader", () => ({
    PageHeader: ({ title, description, actions }: any) => (
        <header>
            <h1>{title}</h1>
            <p data-testid="description">{description}</p>
            {actions}
        </header>
    ),
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
jest.mock("@/app/style/Kpi", () => ({
    Kpi: ({ label, value, helper, tone }: any) => (
        <div data-testid={`kpi-${label}`} data-tone={tone}>
            <span data-testid={`kpi-${label}-value`}>{value}</span>
            <span data-testid={`kpi-${label}-helper`}>{helper}</span>
        </div>
    ),
}));

// Capture the props passed to the board so we can assert on them.
// The `mock` prefix is required for variables used inside jest.mock factories.
let mockBoardProps: any;
jest.mock("./kanbanboard/kanban-board", () => ({
    KanbanBoard: (props: any) => {
        mockBoardProps = props;
        return <div data-testid="kanban-board" />;
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
        ...overrides,
    };
}

async function renderPage() {
    const ui = await ProjectPage({
        params: Promise.resolve({ slug: "acme", projectId: "p1" }),
    });
    return render(ui);
}

beforeEach(() => {
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

        expect(screen.getByRole("heading", { name: "Apollo" })).toBeInTheDocument();
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

describe("ProjectPage – KPIs and progress", () => {
    it("computes totals, in-progress, overdue and progress percent", async () => {
        db.task.findMany.mockResolvedValue([
            makeTask({ id: "1", status: "DONE" }),
            makeTask({ id: "2", status: "IN_PROGRESS" }),
            makeTask({ id: "3", status: "IN_REVIEW" }),
            makeTask({ id: "4", status: "TODO", dueDate: new Date("2026-10-01T00:00:00Z") }),
        ]);

        await renderPage();

        expect(screen.getByTestId("kpi-Tasks-value")).toHaveTextContent("4");
        expect(screen.getByTestId("kpi-Tasks-helper")).toHaveTextContent("1 completed");
        expect(screen.getByTestId("kpi-In progress-value")).toHaveTextContent("2");
        expect(screen.getByTestId("kpi-Overdue-value")).toHaveTextContent("1");
        expect(screen.getByTestId("kpi-Members-value")).toHaveTextContent("3");
        expect(screen.getByTestId("progress")).toHaveTextContent("1/4/25");
    });

    it("shows 0% progress and a calm overdue KPI when there are no tasks", async () => {
        await renderPage();

        expect(screen.getByTestId("progress")).toHaveTextContent("0/0/0");
        expect(screen.getByTestId("kpi-Overdue")).toHaveAttribute("data-tone", "amber");
        expect(screen.getByTestId("kpi-Overdue-helper")).toHaveTextContent(
            "Nothing is late",
        );
    });

    it("uses the red tone when tasks are overdue", async () => {
        db.task.findMany.mockResolvedValue([
            makeTask({ dueDate: new Date("2026-10-10T00:00:00Z") }),
        ]);

        await renderPage();

        expect(screen.getByTestId("kpi-Overdue")).toHaveAttribute("data-tone", "red");
        expect(screen.getByTestId("kpi-Overdue-helper")).toHaveTextContent(
            "Past their due date",
        );
    });

    it("rounds the progress percentage", async () => {
        db.task.findMany.mockResolvedValue([
            makeTask({ id: "1", status: "DONE" }),
            makeTask({ id: "2" }),
            makeTask({ id: "3" }),
        ]);

        await renderPage();

        expect(screen.getByTestId("progress")).toHaveTextContent("1/3/33");
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
                overdue: false,
                assignee,
                subtaskTotal: 3,
                subtaskDone: 2,
            },
        ]);
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
        expect(screen.getByTestId("kpi-Overdue-value")).toHaveTextContent("0");
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
        expect(screen.queryByText("Delete this project")).not.toBeInTheDocument();
    });

    it("binds the visibility action to the workspace slug and project id", async () => {
        mockRequireProjectAccess.mockResolvedValue(makeAccess({ workspaceRole: "OWNER", effectiveRole: "ADMIN" }));

        await renderPage();
        fireEvent.click(screen.getByTestId("toggle-visibility"));

        expect(mockSetVisibility).toHaveBeenCalledWith("acme", "p1");
    });
});