/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";

import SignupGate from "./signup-gate";

jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: any) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
jest.mock("@/components/ui/SocialLoginButton", () => ({
    __esModule: true,
    default: ({ provider }: { provider: string }) => <button type="button">Continue with {provider}</button>,
}));
jest.mock("./signup-form", () => ({ __esModule: true, default: () => <form aria-label="Sign up with email" /> }));

const legalLinks = () => {
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
};

describe("SignupGate", () => {
    it("shows the terms and privacy links next to Google and GitHub sign-up", () => {
        render(<SignupGate />);

        expect(screen.getByRole("button", { name: "Continue with google" })).toBeInTheDocument();
        legalLinks();
    });

    it("keeps them once the email form is open", () => {
        render(<SignupGate />);
        fireEvent.click(screen.getByRole("button", { name: "Create account" }));

        expect(screen.getByRole("form", { name: "Sign up with email" })).toBeInTheDocument();
        legalLinks();
    });
});
