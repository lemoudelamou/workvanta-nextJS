import { redirect } from "next/navigation";

import { Navbar } from "@/components/ui/Navbar";
import { getSession } from "@/lib/auth/session";
import { getIsWorkspaceOwner } from "@/lib/auth/is-owner";
import { prisma } from "@/lib/db/prisma";
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

    const [isOwner, unreadCount, notifications] = await Promise.all([
        getIsWorkspaceOwner(userId),
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
    ]);


    return (
        <>
            <Navbar
                session={session}
                isOwner={isOwner}
                unreadNotificationCount={unreadCount}
                notifications={notifications}
            />
            <RealtimeProvider
                userId={session.user.id}
            />
            {children}
        </>
    );
}