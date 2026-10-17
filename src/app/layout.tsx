import type { Metadata } from "next";

import "./globals.css";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ThemePreference } from "@/generated/prisma/enums";
import { SITE_URL } from "@/lib/legal";


export const metadata: Metadata = {
    // Makes relative URLs in metadata (canonical links, sharing previews) absolute.
    metadataBase: new URL(SITE_URL),
    title: "Workvanta",
    description:
        "Project management for small teams: plan work on a board, list or calendar, and see what's moving, blocked and late.",
    applicationName: "Workvanta",
    openGraph: {
        type: "website",
        siteName: "Workvanta",
        title: "Workvanta · Project management for small teams",
        description: "Every project, every task, one clear view of where things stand.",
        url: "/",
    },
    twitter: { card: "summary" },
};

async function getServerFallbackTheme(): Promise<
    "light" | "dark" | "system"
> {
    const session = await getSession();

    if (!session?.user?.id) {
        return "system";
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferences: { select: { theme: true } } },
    });

    switch (user?.preferences?.theme) {
        case ThemePreference.LIGHT:
            return "light";
        case ThemePreference.DARK:
            return "dark";
        case ThemePreference.SYSTEM:
        default:
            return "system";
    }
}

export default async function RootLayout({
                                             children,
                                         }: Readonly<{
    children: React.ReactNode;
}>) {
    const serverFallbackTheme = await getServerFallbackTheme();

    return (
        <html lang="en" className={cn("font-sans")} suppressHydrationWarning>
        <head>
            <script
                dangerouslySetInnerHTML={{
                    __html: `
              (function () {
                try {
                  var serverFallback = ${JSON.stringify(serverFallbackTheme)};
                  var stored = localStorage.getItem("workvanta-theme");
                  var theme = stored === "light" || stored === "dark" || stored === "system"
                    ? stored
                    : serverFallback;
                  var isDark = theme === "dark" ||
                    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
                  document.documentElement.classList.toggle("dark", isDark);
                  // Prime localStorage so subsequent pages in this session
                  // don't need to re-derive the fallback.
                  localStorage.setItem("workvanta-theme", theme);
                } catch (e) {}
              })();
            `,
                }}
            />
        </head>
        <body className="antialiased">
        {children}
        </body>
        </html>
    );
}