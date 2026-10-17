import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildNotificationViews } from "@/lib/notifications/notification-feed";
import { PageBody } from "@/components/ui/PageBody";
import { NotificationsInbox } from "./notifications-inbox";
import { pageTitle } from "@/lib/navigation/page-title";

/** How many notifications the page shows. */
const PAGE_SIZE = 50;

export default async function NotificationsPage() {
    const session = await getSession();
    if (!session?.user?.id) redirect("/signin");

    const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        select: { id: true, type: true, data: true, readAt: true, createdAt: true },
    });
    const views = await buildNotificationViews(session.user.id, notifications);

    return (
        <PageBody className="max-w-3xl">
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Mentions, comments, assignments and due date reminders, newest first.
            </p>
            <NotificationsInbox initial={views} />
            {notifications.length === PAGE_SIZE && (
                <p className="mt-4 text-center text-xs text-muted-foreground">Showing your latest {PAGE_SIZE}.</p>
            )}
        </PageBody>
    );
}

export const metadata = pageTitle("Notifications");
