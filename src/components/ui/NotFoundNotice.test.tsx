import { render, screen } from "@testing-library/react";

import { NotFoundNotice } from "./NotFoundNotice";

jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

describe("NotFoundNotice", () => {
    it("renders the title, message and actions as links", () => {
        render(
            <NotFoundNotice
                icon={<span />}
                title="Gone"
                message="It was deleted."
                actions={[
                    { href: "/a", label: "First" },
                    { href: "/b", label: "Second" },
                ]}
            />,
        );

        expect(screen.getByRole("heading", { level: 1, name: "Gone" })).toBeInTheDocument();
        expect(screen.getByText("It was deleted.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "First" })).toHaveAttribute("href", "/a");
        expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute("href", "/b");
    });

    it("styles only the first action as the primary button", () => {
        render(
            <NotFoundNotice
                icon={<span />}
                title="Gone"
                message="x"
                actions={[
                    { href: "/a", label: "First" },
                    { href: "/b", label: "Second" },
                ]}
            />,
        );

        expect(screen.getByRole("link", { name: "First" }).className).toContain("bg-brand");
        expect(screen.getByRole("link", { name: "Second" }).className).not.toContain("bg-brand");
    });
});
