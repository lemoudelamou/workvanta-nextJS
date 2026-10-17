import { Monitor, Smartphone, Tablet } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

import RevokeButton from "@/app/(app)/(settings)/settings/sessions-management/revoke-button";

function getDeviceIcon(device: string | null) {
    const deviceName = device?.toLowerCase() ?? "";

    if (
        deviceName.includes("iphone") ||
        deviceName.includes("android phone")
    ) {
        return Smartphone;
    }

    if (
        deviceName.includes("ipad") ||
        deviceName.includes("tablet")
    ) {
        return Tablet;
    }

    return Monitor;
}

const MINUTE = 60_000;

/** "Active now", "Active 5 minutes ago", "Active Oct 12". */
export function lastActiveLabel(lastUsedAt: Date, now = new Date()) {
    const diff = now.getTime() - lastUsedAt.getTime();
    if (diff < 2 * MINUTE) return "Active now";
    if (diff < 60 * MINUTE) return `Active ${Math.round(diff / MINUTE)} minutes ago`;
    if (diff < 24 * 60 * MINUTE) {
        const hours = Math.round(diff / (60 * MINUTE));
        return `Active ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }
    return `Active ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(lastUsedAt)}`;
}

function formatLocation({
    city,
    region,
    country,
}: {
    city: string | null;
    region: string | null;
    country: string | null;
}) {
    const parts = [city, region, country].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : null;
}

export default async function SessionsManagement() {
    const currentSession = await getSession();

    if (!currentSession?.user?.id) {
        return null;
    }

    const activeSessions = await prisma.session.findMany({
        where: {
            userId: currentSession.user.id,
            expiresAt: { gt: new Date() },
        },
        orderBy: { lastUsedAt: "desc" },
        select: {
            id: true,
            lastUsedAt: true,
            device: true,
            browser: true,
            ipAddress: true,
            city: true,
            region: true,
            country: true,
        },
    });

    // This device first, then most recently used.
    activeSessions.sort(
        (a, b) =>
            Number(b.id === currentSession.sessionId) - Number(a.id === currentSession.sessionId),
    );

    if (activeSessions.length === 0) {
        return <p className="px-5 py-4 text-sm text-muted-foreground sm:px-6">No active sessions.</p>;
    }

    return (
        <div>
            <ul className="divide-y divide-border">
                {activeSessions.map((activeSession) => {
                    const DeviceIcon = getDeviceIcon(activeSession.device);
                    const isCurrent = activeSession.id === currentSession.sessionId;
                    const location = formatLocation(activeSession);
                    const details = [
                        location,
                        activeSession.ipAddress,
                        isCurrent ? "Active now" : lastActiveLabel(activeSession.lastUsedAt),
                    ].filter(Boolean);

                    return (
                        <li key={activeSession.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                            <span
                                aria-hidden="true"
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"
                            >
                                <DeviceIcon className="size-[18px]" />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                                    {activeSession.browser ?? "Unknown browser"} on{" "}
                                    {activeSession.device ?? "an unknown device"}
                                    {isCurrent && (
                                        <span className="rounded-full bg-status-done/12 px-2 py-0.5 text-xs font-medium text-status-done">
                                            This device
                                        </span>
                                    )}
                                </p>
                                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                    {details.join(", ")}
                                </p>
                            </div>

                            {!isCurrent && <RevokeButton sessionId={activeSession.id} />}
                        </li>
                    );
                })}
            </ul>
            <p className="border-t border-border px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
                Locations are approximate, based on the IP address. Sign out a device you don&apos;t
                recognise, then change your password.
            </p>
        </div>
    );
}
