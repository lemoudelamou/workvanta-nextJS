/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import { DashboardView } from "./DashboardView";
import type { Membership } from "./types";

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const workspace = (id: string, members: number): Membership => ({
    role: "OWNER",
    workspace: { id, slug: id, name: id, description: null, updatedAt: new Date("2026-10-01"), _count: { members } },
});

function renderDashboard(teammateCount: number) {
    render(
        <DashboardView
            session={{ user: { name: "Ada Lovelace", email: "ada@x.com" } }}
            focus={{ overdue: 0, today: 0, week: 0, upNext: [] }}
            // Each workspace counts Ada herself, and the same teammate is in two of them.
            memberships={[workspace("a", 2), workspace("b", 1), workspace("c", 2), workspace("d", 1)]}
            recentProjects={[]}
            accessibleProjectCountByWorkspace={new Map()}
            totalAccessibleProjectCount={0}
            teammateCount={teammateCount}
        />,
    );
    return screen.getByRole("region", { name: "Summary" }).textContent?.replace(/\s+/g, " ");
}

describe("DashboardView summary", () => {
    it("counts each teammate once, not once per shared workspace", () => {
        const summary = renderDashboard(1);
        expect(summary).toContain("1 teammate");
        expect(summary).not.toContain("6 teammates");
    });

    it("pluralises", () => {
        expect(renderDashboard(3)).toContain("3 teammates");
    });
});
