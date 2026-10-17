import Link from "next/link";

import WorkvantaBrand from "@/components/ui/WorkvantaBrand";

/** Signed-in people get the dashboard where others get "Sign in". */
export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
    const links = [
        { href: "/#features", label: "Features" },
        { href: "/guide", label: "Guide" },
        signedIn ? { href: "/dashboard", label: "Dashboard" } : { href: "/signin", label: "Sign in" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
    ];

    return (
        <footer className="border-t border-border">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-4">
                    <WorkvantaBrand href="/" />
                    <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Workvanta</p>
                </div>

                <nav aria-label="Footer">
                    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        {links.map((link) => (
                            <li key={link.href}>
                                <Link href={link.href} className="transition-colors hover:text-foreground">
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </footer>
    );
}
