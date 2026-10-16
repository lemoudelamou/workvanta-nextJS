/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

import NewProjectPage from "./page";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createProject } from "@/app/(app)/(workspace)/workspace/[slug]/project/new/project-actions";
import { buttonStyles } from "@/app/style/button-style";

// ---------- module mocks ----------
jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
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
    ArrowLeft: () => null,
    ArrowRight: () => null,
    FolderKanban: () => null,
}));

jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/db/prisma", () => ({
    prisma: { workspace: { findFirst: jest.fn() } },
}));
jest.mock(
    "@/app/(app)/(workspace)/workspace/[slug]/project/new/project-actions",
    () => ({ createProject: jest.fn() }),
);
jest.mock("@/app/style/button-style", () => ({
    buttonStyles: jest.fn(() => "btn"),
}));

jest.mock("@/components/ui/AlertMessage", () => ({
        AlertMessage: ({ variant, title, message }: any) => (
            <div data-testid="alert" data-variant={variant}>
            <strong>{title}</strong>
            <span>{message}</span>
            </div>
),
}));
jest.mock("@/components/ui/PageBody", () => ({
    CenteredFormPage: ({ children }: any) => <main>{children}</main>,
}));
jest.mock("@/components/ui/IconBadge", () => ({
    IconBadge: ({ children }: any) => <div data-testid="icon-badge">{children}</div>,
}));
jest.mock("@/components/ui/FormField", () => ({
    Field: ({ label, optional, children }: any) => (
        <div data-testid={`field-${label}`} data-optional={optional ? "true" : "false"}>
    <span>{label}</span>
{children}
</div>
),
Input: (props: any) => <input {...props} />,
Textarea: (props: any) => <textarea {...props} />,
Select: (props: any) => <select {...props} />,
}));

// ---------- typed handles ----------
const mockNotFound = notFound as unknown as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockCreateProject = createProject as jest.Mock;
const mockButtonStyles = buttonStyles as unknown as jest.Mock;
const db = prisma as unknown as { workspace: { findFirst: jest.Mock } };

// ---------- helpers ----------
const workspace = {
    id: "w1",
    name: "Acme Inc",
    slug: "acme",
    members: [{ role: "MEMBER" }],
};

async function callPage(searchParams: { error?: string } = {}) {
    return (await NewProjectPage({
        params: Promise.resolve({ slug: "acme" }),
        searchParams: Promise.resolve(searchParams),
    })) as ReactElement;
}

async function renderPage(searchParams: { error?: string } = {}) {
    return render(await callPage(searchParams));
}

/** Walks the returned element tree and returns the <form> element's props. */
function findFormProps(node: any): any {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
        for (const child of node) {
            const found = findFormProps(child);
            if (found) return found;
        }
        return null;
    }
    if (node.type === "form") return node.props;
    return findFormProps(node.props?.children);
}

async function getFormAction(searchParams: { error?: string } = {}) {
    const props = findFormProps(await callPage(searchParams));
    return props.action as (formData: FormData) => Promise<void>;
}

function makeFormData(values: Record<string, string> = {}) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    return fd;
}

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    db.workspace.findFirst.mockResolvedValue(workspace);
    mockCreateProject.mockResolvedValue(undefined);
});

afterEach(() => {
    jest.clearAllMocks(); // keeps the throwing notFound/redirect implementations
});

// ---------- tests ----------
describe("NewProjectPage – guards", () => {
    it("redirects to /signin when there is no session user", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(callPage()).rejects.toThrow("NEXT_REDIRECT:/signin");
        expect(db.workspace.findFirst).not.toHaveBeenCalled();
    });

    it("calls notFound when the workspace does not exist or the user is not a member", async () => {
        db.workspace.findFirst.mockResolvedValue(null);

        await expect(callPage()).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
    });

    it("scopes the workspace lookup to the slug and the current user", async () => {
        await renderPage();

        expect(db.workspace.findFirst).toHaveBeenCalledWith({
            where: { slug: "acme", members: { some: { userId: "u1" } } },
            select: {
                id: true,
                name: true,
                slug: true,
                members: {
                    where: { userId: "u1" },
                    select: { role: true },
                    take: 1,
                },
            },
        });
    });
});

describe("NewProjectPage – permissions", () => {
    it("sends guests back to the workspace", async () => {
        db.workspace.findFirst.mockResolvedValue({
            ...workspace,
            members: [{ role: "GUEST" }],
        });

        await expect(callPage()).rejects.toThrow("NEXT_REDIRECT:/workspace/acme");
    });
});

describe("NewProjectPage – content", () => {
    it("renders a back link to the workspace", async () => {
        await renderPage();

        const link = screen.getByRole("link", { name: "Acme Inc" });
        expect(link).toHaveAttribute("href", "/workspace/acme");
    });

    it("renders the heading, intro text and icon badge", async () => {
        await renderPage();

        expect(
            screen.getByRole("heading", { level: 1, name: "Create a project" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/focused place to plan, assign, and complete work/)).toBeInTheDocument();
        expect(screen.getByTestId("icon-badge")).toBeInTheDocument();
    });
});

describe("NewProjectPage – error alert", () => {
    it("does not show an alert by default", async () => {
        await renderPage();

        expect(screen.queryByTestId("alert")).not.toBeInTheDocument();
    });

    it("shows the duplicate-name alert", async () => {
        await renderPage({ error: "duplicate-name" });

        const alert = screen.getByTestId("alert");
        expect(alert).toHaveAttribute("data-variant", "error");
        expect(alert).toHaveTextContent("A project with this name already exists");
        expect(alert).toHaveTextContent("Choose a different name");
    });

    it("ignores unknown error values", async () => {
        await renderPage({ error: "something-else" });

        expect(screen.queryByTestId("alert")).not.toBeInTheDocument();
    });
});

describe("NewProjectPage – form", () => {
    it("renders a required project name input with a length limit", async () => {
        const { container } = await renderPage();

        const input = container.querySelector('input[name="name"]');
        expect(input).toBeRequired();
        expect(input).toHaveAttribute("maxlength", "100");
        expect(input).toHaveAttribute("placeholder", "e.g. Website redesign");
        expect(screen.getByTestId("field-Project name")).toHaveAttribute("data-optional", "false");
    });

    it("renders an optional description textarea with a length limit", async () => {
        const { container } = await renderPage();

        const textarea = container.querySelector('textarea[name="description"]');
        expect(textarea).not.toBeRequired();
        expect(textarea).toHaveAttribute("maxlength", "500");
        expect(textarea).toHaveAttribute("rows", "4");
        expect(screen.getByTestId("field-Description")).toHaveAttribute("data-optional", "true");
    });

    it("renders a full-width large submit button", async () => {
        await renderPage();

        expect(screen.getByRole("button", { name: "Create project" })).toHaveAttribute(
            "type",
            "submit",
        );
        expect(mockButtonStyles).toHaveBeenCalledWith({ size: "lg", className: "w-full" });
    });
});

describe("NewProjectPage – create action", () => {
    it("passes the workspace id and form data to createProject", async () => {
        const action = await getFormAction();
        const formData = makeFormData({ name: "Apollo", description: "Moon" });

        await action(formData);

        expect(mockCreateProject).toHaveBeenCalledWith("w1", formData);
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("redirects back to the form with an error on a duplicate name", async () => {
        mockCreateProject.mockResolvedValue({ error: "duplicate-name" });
        const action = await getFormAction();

        await expect(action(makeFormData({ name: "Apollo" }))).rejects.toThrow(
            "NEXT_REDIRECT:/workspace/acme/project/new?error=duplicate-name",
        );
        expect(mockRedirect).toHaveBeenCalledWith(
            "/workspace/acme/project/new?error=duplicate-name",
        );
    });

    it("redirects with a generic error for other error values", async () => {
        mockCreateProject.mockResolvedValue({ error: "unknown" });
        const action = await getFormAction();

        await expect(action(makeFormData({ name: "Apollo" }))).rejects.toThrow(
            "NEXT_REDIRECT:/workspace/acme/project/new?error=invalid",
        );
    });

    it("does not redirect when creation succeeds without a result", async () => {
        const action = await getFormAction();

        await expect(action(makeFormData({ name: "Apollo" }))).resolves.toBeUndefined();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("propagates errors thrown by createProject", async () => {
        mockCreateProject.mockRejectedValue(new Error("db down"));
        const action = await getFormAction();

        await expect(action(makeFormData())).rejects.toThrow("db down");
    });
});