/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

import VerifyEmailPage from "./page";

// ---------- module mocks ----------
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
jest.mock("lucide-react", () => ({
    AlertTriangle: () => <svg data-testid="icon-alert" />,
    ArrowRight: () => <svg data-testid="icon-arrow" />,
    CheckCircle2: () => <svg data-testid="icon-check" />,
}));
jest.mock("@/components/ui/WorkvantaBrand", () => ({
    __esModule: true,
    default: () => <div data-testid="brand" />,
}));
// Distinct strings so we can tell which button style each link received
jest.mock("@/app/style/ui-tokens", () => ({
    authButton: "auth-btn",
    ghostButton: "ghost-btn",
    glass: "glass",
    hairline: "hairline",
    primaryButton: "primary-btn",
    starlightEdge: "edge",
}));

// ---------- tests ----------
describe("VerifyEmailPage – success state", () => {
    it("renders the title and confirmation message", () => {
        render(<VerifyEmailPage />);

        expect(
            screen.getByRole("heading", { level: 1, name: "Email verified" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/has been successfully verified/),
        ).toBeInTheDocument();
    });

    it("announces the result as a polite status, not an alert", () => {
        render(<VerifyEmailPage />);

        const status = screen.getByRole("status");
        expect(status).toHaveTextContent("Email verified");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows the success icon and not the warning icon", () => {
        render(<VerifyEmailPage />);

        expect(screen.getByTestId("icon-check")).toBeInTheDocument();
        expect(screen.queryByTestId("icon-alert")).not.toBeInTheDocument();
    });

    it("renders the brand and tagline", () => {
        render(<VerifyEmailPage />);

        expect(screen.getByTestId("brand")).toBeInTheDocument();
        expect(screen.getByText("Work smarter, together.")).toBeInTheDocument();
    });
});

describe("VerifyEmailPage – actions", () => {
    it("lists Continue first and Open settings second", () => {
        render(<VerifyEmailPage />);

        const links = screen.getAllByRole("link");
        expect(links).toHaveLength(2);
        expect(links[0]).toHaveTextContent("Continue to Workvanta");
        expect(links[1]).toHaveTextContent("Open settings");
    });

    it("links to the dashboard and settings", () => {
        render(<VerifyEmailPage />);

        expect(
            screen.getByRole("link", { name: /Continue to Workvanta/ }),
        ).toHaveAttribute("href", "/dashboard");
        expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
            "href",
            "/settings",
        );
    });

    it("styles Continue as the primary button and settings as ghost", () => {
        render(<VerifyEmailPage />);

        const cont = screen.getByRole("link", { name: /Continue to Workvanta/ });
        expect(cont).toHaveClass("auth-btn", "primary-btn");
        expect(cont).not.toHaveClass("ghost-btn");

        const settings = screen.getByRole("link", { name: "Open settings" });
        expect(settings).toHaveClass("auth-btn", "ghost-btn");
        expect(settings).not.toHaveClass("primary-btn");
    });

    it("shows the arrow only on the Continue link", () => {
        render(<VerifyEmailPage />);

        const cont = screen.getByRole("link", { name: /Continue to Workvanta/ });
        expect(cont.querySelector('[data-testid="icon-arrow"]')).not.toBeNull();
        expect(
            screen.getByRole("link", { name: "Open settings" }).querySelector(
                '[data-testid="icon-arrow"]',
            ),
        ).toBeNull();
    });
});