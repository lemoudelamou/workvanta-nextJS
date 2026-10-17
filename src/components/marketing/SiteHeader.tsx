import Link from "next/link";

import WorkvantaBrand from "@/components/ui/WorkvantaBrand";
import { buttonStyles } from "@/app/style/button-style";

/** The header on public pages: the home page and the legal pages. */
export function SiteHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <WorkvantaBrand href="/" />

                <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
                    <Link
                        href="/#features"
                        className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
                    >
                        Features
                    </Link>
                    <Link
                        href="/signin"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Sign in
                    </Link>
                    <Link href="/signup" className={buttonStyles({ variant: "primary" })}>
                        Get started
                    </Link>
                </nav>
            </div>
        </header>
    );
}
