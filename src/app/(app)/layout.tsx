import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/AppShell";
import { LAST_WORKSPACE_COOKIE, SIDEBAR_COOKIE } from "@/lib/navigation/shell-cookies";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getMyOpenTaskCount, getShellWorkspaces } from "@/lib/navigation/shell-data";
import { RealtimeProvider } from "@/lib/publisher/realtime-provider";
import { buildNotificationViews } from "@/lib/notifications/notification-feed";

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

    const [workspaces, myOpenTasks, unreadCount, notifications, cookieStore] = await Promise.all([
        getShellWorkspaces(userId),
        getMyOpenTaskCount(userId),
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

    const notificationViews = await buildNotificationViews(userId, notifications);

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
                myOpenTasks={myOpenTasks}
                initiallyCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
                notifications={notificationViews}
            >
                {children}
            </AppShell>
        </>
    );
}
