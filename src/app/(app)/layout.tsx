import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell, LAST_WORKSPACE_COOKIE } from "@/components/shell/AppShell";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getShellWorkspaces } from "@/lib/navigation/shell-data";
import { RealtimeProvider } from "@/lib/publisher/realtime-provider";

export default async function AppLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session?.user) {
        redirect("/signin");
    }

    const userId = session.user.id;

    const [workspaces, unreadCount, notifications, cookieStore] = await Promise.all([
        getShellWorkspaces(userId),
        prisma.notification.count({
            where: { userId, readAt: null },
        }),
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                type: true,
                data: true,
                readAt: true,
                createdAt: true,
            },
        }),
        cookies(),
    ]);

    const name =
        session.user.name?.trim() || session.user.email?.split("@")[0] || "User";

    return (
        <>
            <RealtimeProvider userId={userId} />
            <AppShell
                user={{
                    name,
                    email: session.user.email ?? "",
                    image: session.user.image ?? null,
                }}
                workspaces={workspaces}
                lastWorkspaceSlug={cookieStore.get(LAST_WORKSPACE_COOKIE)?.value ?? null}
                unreadCount={unreadCount}
                notifications={notifications}
            >
                {children}
            </AppShell>
        </>
    );
}
