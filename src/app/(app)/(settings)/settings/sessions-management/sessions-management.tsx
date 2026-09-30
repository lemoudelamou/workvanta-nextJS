import {
    Monitor,
    Smartphone,
    Tablet,
    MapPin,
    Globe2,
    Clock3,
} from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

import RevokeButton from "@/app/(app)/(settings)/settings/sessions-management/revoke-button";
import ActiveSessions from "@/app/(app)/(settings)/settings/sessions-management/active-sessions";

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

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
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

    return parts.length > 0
        ? parts.join(", ")
        : "Location unavailable";
}

export default async function SessionsManagement() {
    const currentSession = await getSession();

    if (!currentSession?.user?.id) {
        return null;
    }

    const activeSessions = await prisma.session.findMany({
        where: {
            userId: currentSession.user.id,
            expiresAt: {
                gt: new Date(),
            },
        },
        orderBy: {
            expiresAt: "desc",
        },
        select: {
            id: true,
            expiresAt: true,
            device: true,
            browser: true,
            ipAddress: true,
            city: true,
            region: true,
            country: true,
        },
    });

    if (activeSessions.length === 0) {
        return (
            <ActiveSessions count={0}>
                <div className="p-5 sm:p-7">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        No active sessions found.
                    </p>
                </div>
            </ActiveSessions>
        );
    }

    return (
        <ActiveSessions count={activeSessions.length}>
            <div className="divide-y divide-slate-200/80 dark:divide-white/[0.08]">
                {activeSessions.map((activeSession) => {
                    const DeviceIcon = getDeviceIcon(activeSession.device);

                    const isCurrentSession =
                        activeSession.id === currentSession.sessionId;

                    return (
                        <div
                            key={activeSession.id}
                            className="flex flex-col gap-5 p-5 sm:p-6"
                        >
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                                <div className="flex min-w-0 flex-1 items-start gap-4">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
                                        <DeviceIcon className="size-5" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                                {activeSession.device ??
                                                    "Unknown device"}
                                                {" · "}
                                                {activeSession.browser ??
                                                    "Unknown browser"}
                                            </p>

                                            {isCurrentSession && (
                                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08] dark:text-emerald-300">
                                                    This device
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                            <div className="flex items-start gap-2.5">
                                                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500" />

                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                        Location
                                                    </p>

                                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                                        {formatLocation(
                                                            activeSession,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-2.5">
                                                <Globe2 className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500" />

                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                        IP address
                                                    </p>

                                                    <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">
                                                        {activeSession.ipAddress ??
                                                            "Unavailable"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                            <Clock3 className="size-4" />

                                            <span>
                                                Expires{" "}
                                                {formatDate(
                                                    activeSession.expiresAt,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0">
                                    {isCurrentSession ? (
                                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-500">
                                            Current session
                                        </span>
                                    ) : (
                                        <RevokeButton
                                            sessionId={activeSession.id}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
                <p className="text-sm leading-6 text-amber-800 dark:text-amber-200">
                    Location is approximate and based on the session IP
                    address. Your current session cannot be revoked from
                    this page.
                </p>
            </div>
        </ActiveSessions>
    );
}

