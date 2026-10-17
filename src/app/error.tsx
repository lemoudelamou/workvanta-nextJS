"use client";

import WorkvantaBrand from "@/components/ui/WorkvantaBrand";
import { ErrorNotice } from "@/components/ui/ErrorNotice";

// Pages outside the app shell (sign-in, invitations, legal pages) bring
// their own minimal header, like the not-found page.
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return (
        <main className="min-h-screen bg-canvas text-foreground">
            <header className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                <WorkvantaBrand />
            </header>
            <ErrorNotice error={error} retry={retry} />
        </main>
    );
}
