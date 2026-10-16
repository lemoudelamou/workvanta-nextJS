/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

import NewWorkspacePage from "./page";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createWorkspace } from "@/app/(app)/(workspace)/workspace/workspace-actions";
import { buttonStyles } from "@/app/style/button-style";

// ---------- module mocks ----------
jest.mock("next/navigation", () => ({
    redirect: jest.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
jest.mock("lucide-react", () => ({
    ArrowRight: () => null,
    Building2: () => null,
    Sparkles: () => null,
}));

jest.mock("@/lib/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("@/app/(app)/(workspace)/workspace/workspace-actions", () => ({
    createWorkspace: jest.fn(),
}));
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
}));

// ---------- typed handles ----------
const mockRedirect = redirect as unknown as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockCreateWorkspace = createWorkspace as unknown as jest.Mock;
const mockButtonStyles = buttonStyles as unknown as jest.Mock;

// ---------- helpers ----------
async function callPage(searchParams: { error?: string } = {}) {
    return (await NewWorkspacePage({
        searchParams: Promise.resolve(searchParams),
    })) as ReactElement;
}

async function renderPage(searchParams: { error?: string } = {}) {
    return render(await callPage(searchParams));
}

/** Walks the unrendered element tree and returns the <form> element's props. */
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

beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
});

afterEach(() => {
    jest.clearAllMocks(); // keeps the throwing redirect implementation
});

// ---------- tests ----------
describe("NewWorkspacePage – guards", () => {
    it("redirects to /signin when there is no session", async () => {
        mockGetSession.mockResolvedValue(null);

        await expect(callPage()).rejects.toThrow("NEXT_REDIRECT:/signin");
        expect(mockRedirect).toHaveBeenCalledWith("/signin");
    });

    it("redirects when the session has no user", async () => {
        mockGetSession.mockResolvedValue({});

        await expect(callPage()).rejects.toThrow("NEXT_REDIRECT:/signin");
    });

    it("does not redirect for a signed-in user", async () => {
        await renderPage();

        expect(mockRedirect).not.toHaveBeenCalled();
    });
});

describe("NewWorkspacePage – content", () => {
    it("renders the heading, eyebrow, intro and icon badge", async () => {
        await renderPage();

        expect(
            screen.getByRole("heading", { level: 1, name: "Create your workspace" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Get started")).toBeInTheDocument();
        expect(screen.getByText(/A workspace is your team's shared home/)).toBeInTheDocument();
        expect(screen.getByTestId("icon-badge")).toBeInTheDocument();
    });

    it("tells the user they will become the owner", async () => {
        await renderPage();

        expect(
            screen.getByText(/You'll be the workspace owner and can invite people/),
        ).toBeInTheDocument();
    });
});

describe("NewWorkspacePage – error alert", () => {
    it("does not show an alert by default", async () => {
        await renderPage();

        expect(screen.queryByTestId("alert")).not.toBeInTheDocument();
    });

    it("shows the duplicate-name alert", async () => {
        await renderPage({ error: "duplicate-name" });

        const alert = screen.getByTestId("alert");
        expect(alert).toHaveAttribute("data-variant", "error");
        expect(alert).toHaveTextContent("A workspace with this name already exists");
        expect(alert).toHaveTextContent("Choose a different name for your new workspace.");
    });

    it("ignores unknown error values", async () => {
        await renderPage({ error: "something-else" });

        expect(screen.queryByTestId("alert")).not.toBeInTheDocument();
    });
});

describe("NewWorkspacePage – form", () => {
    it("submits directly to the createWorkspace action", async () => {
        const props = findFormProps(await callPage());

        expect(props.action).toBe(mockCreateWorkspace);
    });

    it("renders a required workspace name input with a length limit", async () => {
        const { container } = await renderPage();

        const input = container.querySelector('input[name="name"]');
        expect(input).toBeRequired();
        expect(input).toHaveAttribute("maxlength", "80");
        expect(input).toHaveAttribute("placeholder", "e.g. Acme Studio");
        expect(screen.getByTestId("field-Workspace name")).toHaveAttribute(
            "data-optional",
            "false",
        );
    });

    it("renders an optional description textarea with a length limit", async () => {
        const { container } = await renderPage();

        const textarea = container.querySelector('textarea[name="description"]');
        expect(textarea).not.toBeRequired();
        expect(textarea).toHaveAttribute("maxlength", "280");
        expect(textarea).toHaveAttribute("rows", "3");
        expect(screen.getByTestId("field-What does your team work on?")).toHaveAttribute(
            "data-optional",
            "true",
        );
    });

    it("renders a full-width large submit button", async () => {
        await renderPage();

        expect(screen.getByRole("button", { name: "Create workspace" })).toHaveAttribute(
            "type",
            "submit",
        );
        expect(mockButtonStyles).toHaveBeenCalledWith({ size: "lg", className: "w-full" });
    });
});