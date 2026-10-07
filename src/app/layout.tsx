import type { Metadata } from "next";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ThemePreference } from "@/generated/prisma/enums";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
    title: "Workvanta",
    description: "Work smarter. Manage everything.",
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
        <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
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