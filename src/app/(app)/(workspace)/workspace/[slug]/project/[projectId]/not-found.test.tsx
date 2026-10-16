import { render, screen } from "@testing-library/react";

import ProjectNotFound from "./not-found";
import TaskNotFound from "./tasks/[taskId]/not-found";
import WorkspaceNotFound from "../../not-found";

jest.mock("next/navigation", () => ({
    useParams: () => ({ slug: "acme", projectId: "p1", taskId: "t1" }),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

describe("not-found pages", () => {
    it("workspace: explains both missing and not-a-member, links to all workspaces", () => {
        render(<WorkspaceNotFound />);

        expect(screen.getByRole("heading", { name: "Workspace not available" })).toBeInTheDocument();
        expect(screen.getByText(/doesn't exist, or you're not a member/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "All workspaces" })).toHaveAttribute("href", "/workspace");
    });

    it("project: links back to the workspace from the URL", () => {
        render(<ProjectNotFound />);

        expect(
            screen.getByRole("heading", { name: "This project no longer exists" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to workspace" })).toHaveAttribute(
            "href",
            "/workspace/acme",
        );
    });

    it("task: links back to the project", () => {
        render(<TaskNotFound />);

        expect(screen.getByRole("heading", { name: "This task has been deleted" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to project" })).toHaveAttribute(
            "href",
            "/workspace/acme/project/p1",
        );
    });
});
