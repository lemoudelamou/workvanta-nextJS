import type { Metadata } from "next";
import { Compass, LayoutDashboard } from "lucide-react";

import WorkvantaBrand from "@/components/ui/WorkvantaBrand";
import { NotFoundNotice } from "@/components/ui/NotFoundNotice";

export const metadata: Metadata = {
    title: "Page not found · Workvanta",
};

// Shown for any URL the app doesn't have, and for notFound() calls that no
// closer not-found page handles. Unmatched URLs skip the app layout, so this
// page brings its own minimal header.
export default function NotFound() {
    return (
        <main className="min-h-screen bg-canvas text-foreground">
            <header className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                <WorkvantaBrand />
            </header>

            <NotFoundNotice
                icon={<Compass className="size-5" />}
                title="Page not found"
                message="There's nothing at this address. Check the link for typos, or head back to your dashboard."
                actions={[
                    {
                        href: "/dashboard",
                        label: "Go to dashboard",
                        icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
                    },
                    { href: "/workspace", label: "All workspaces" },
                ]}
            />
        </main>
    );
}
