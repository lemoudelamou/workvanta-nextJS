import { ArrowUp, Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

import { getSession } from "@/lib/auth/session";

import { NotificationItem } from "@/app/(app)/notifications/notification-item";
import { PageBody } from "@/components/ui/PageBody";
import { PageHeader } from "@/components/ui/PageHeader";
import { hairline, glass, starlightEdge, eyebrow, chipClass, iconTile } from "@/app/style/ui-tokens";


export default async function NotificationsPage() {
    const session = await getSession();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const notifications = await prisma.notification.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 50,
    });

    const unreadCount = notifications.filter(
        (notification) => notification.readAt === null,
    ).length;

    return (
        <PageBody>

            <PageHeader
                eyebrow="Activity center"
                title="Notifications"
                description="Stay up to date with activity across your workspaces and projects."
                actions={""}
            />



            <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className={chipClass}>
                    <span className="size-1.5 rounded-full bg-slate-400" />

                    {notifications.length}{" "}
                    {notifications.length === 1
                        ? "notification"
                        : "notifications"}
                </div>

                {unreadCount > 0 ? (
                    <div className={chipClass}>
                        <span className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]" />

                        {unreadCount > 99 ? "99+" : unreadCount} unread
                    </div>
                ) : (
                    <div className={chipClass}>
                        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
                        All caught up
                    </div>
                )}
            </div>

            <section
                className={`${glass} ${hairline} ${starlightEdge} relative mt-4 overflow-hidden rounded-2xl`}
            >
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center px-6 py-16 text-center sm:px-10">
                        <div
                            className={`${iconTile} mb-6 size-14 rounded-2xl`}
                        >
                            <Inbox className="size-6" />
                        </div>

                        <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                            You&apos;re all caught up
                        </h2>

                        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                            There&apos;s nothing new here right now. When
                            something needs your attention, it&apos;ll
                            appear in this space.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 sm:px-6 dark:border-white/[0.06]">
                            <div>
                                <p className={eyebrow}>Inbox</p>

                                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                                    Recent activity
                                </h2>
                            </div>

                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Latest 50
                            </span>
                        </div>

                        <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    id={notification.id}
                                    type={notification.type}
                                    data={notification.data}
                                    readAt={notification.readAt}
                                    createdAt={notification.createdAt}
                                />
                            ))}
                        </div>
                    </>
                )}
            </section>

            {notifications.length > 0 && (
                <div className="mt-5 flex items-center justify-between px-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Showing your most recent notifications.
                    </p>

                    <a
                        href="#top"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-500/10 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowUp className="size-3.5" />
                        Back to top
                    </a>
                </div>
            )}
        </PageBody>
    );
}