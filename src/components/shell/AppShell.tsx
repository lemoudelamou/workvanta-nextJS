"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";

import type { ShellWorkspace } from "@/lib/navigation/shell-data";
import { NotificationBell, type BellNotification } from "@/app/(app)/notifications/NotificationBell";
import { SidebarContent } from "./SidebarContent";
import { CommandPalette } from "./CommandPalette";
import { workspaceInitials } from "./WorkspaceSwitcher";
import type { ShellUser } from "./UserMenu";

import { LAST_WORKSPACE_COOKIE, SIDEBAR_COOKIE } from "@/lib/navigation/shell-cookies";

/** The workspace the URL is in, if any ("/workspace/new" is not one). */
export function slugFromPath(pathname: string) {
    const match = /^\/workspace\/([^/]+)/.exec(pathname);
    return match && match[1] !== "new" ? decodeURIComponent(match[1]) : null;
}

/**
 * Which workspace the sidebar shows: the one in the URL, else the last one
 * visited, else the first.
 */
export function resolveCurrentWorkspace(
    workspaces: ShellWorkspace[],
    pathname: string,
    lastSlug: string | null,
) {
    const fromPath = slugFromPath(pathname);
    return (
        workspaces.find((w) => w.slug === fromPath) ??
        workspaces.find((w) => w.slug === lastSlug) ??
        workspaces[0] ??
        null
    );
}

export function AppShell({
    user,
    workspaces,
    lastWorkspaceSlug,
    unreadCount,
    myOpenTasks = 0,
    initiallyCollapsed = false,
    notifications,
    children,
}: {
    user: ShellUser;
    workspaces: ShellWorkspace[];
    lastWorkspaceSlug: string | null;
    unreadCount: number;
    myOpenTasks?: number;
    /** From a cookie, so the first render already has the right width. */
    initiallyCollapsed?: boolean;
    notifications: BellNotification[];
    children: ReactNode;
}) {
    const pathname = usePathname() ?? "/";
    const current = resolveCurrentWorkspace(workspaces, pathname, lastWorkspaceSlug);
    const drawerRef = useRef<HTMLDialogElement>(null);
    const pathSlug = slugFromPath(pathname);
    const [collapsed, setCollapsed] = useState(initiallyCollapsed);
    const [searchOpen, setSearchOpen] = useState(false);

    function toggleCollapsed() {
        setCollapsed((value) => {
            const next = !value;
            document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
            return next;
        });
    }

    // Ctrl+K / ⌘K opens quick search from anywhere.
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                drawerRef.current?.close();
                setSearchOpen(true);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    // Remember the workspace so Home and My tasks keep showing its projects.
    useEffect(() => {
        if (pathSlug && workspaces.some((w) => w.slug === pathSlug)) {
            document.cookie = `${LAST_WORKSPACE_COOKIE}=${encodeURIComponent(pathSlug)}; path=/; max-age=31536000; samesite=lax`;
        }
    }, [pathSlug, workspaces]);

    // Close the phone drawer after any navigation.
    useEffect(() => {
        drawerRef.current?.close();
    }, [pathname]);

    // Close the drawer when a link inside it is used, even for the page
    // we're already on (that doesn't change the pathname).
    function closeOnLink(event: MouseEvent<HTMLElement>) {
        if ((event.target as Element).closest("a")) {
            event.currentTarget.closest("dialog")?.close();
        }
    }

    const sidebar = (rail: boolean, inDrawer = false) => (
        <SidebarContent
            pathname={pathname}
            workspaces={workspaces}
            current={current}
            user={user}
            unreadCount={unreadCount}
            myOpenTasks={myOpenTasks}
            collapsed={rail}
            // The phone drawer is always full width; collapsing is a desktop thing.
            onToggleCollapsed={inDrawer ? undefined : toggleCollapsed}
            onOpenSearch={() => setSearchOpen(true)}
        />
    );

    return (
        <div className="min-h-dvh bg-sidebar">
            {/* Desktop: fixed sidebar. */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block ${collapsed ? "w-16" : "w-64"}`}
                aria-label="Sidebar"
            >
                {sidebar(collapsed)}
            </aside>

            {/* Phones and tablets: top bar plus a slide-out drawer. */}
            <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-xl lg:hidden">
                <button
                    type="button"
                    onClick={() => drawerRef.current?.showModal()}
                    aria-label="Open navigation"
                    className="flex size-9 items-center justify-center rounded-lg text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <Menu className="size-5" aria-hidden="true" />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                        aria-hidden="true"
                        className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-semibold text-background"
                    >
                        {current ? workspaceInitials(current.name) : "W"}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground">
                        {current?.name ?? "Workvanta"}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Search and jump to…"
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <Search className="size-[18px]" aria-hidden="true" />
                </button>
                {/* Also keeps the live notification connection open on every size. */}
                <NotificationBell unreadCount={unreadCount} notifications={notifications} />
            </header>

            <dialog
                ref={drawerRef}
                aria-label="Navigation"
                className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-[288px] max-w-[85vw] bg-sidebar p-0 text-foreground shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[shell-drawer_180ms_ease-out] lg:hidden"
            >
                <button
                    type="button"
                    onClick={(event) => event.currentTarget.closest("dialog")?.close()}
                    aria-label="Close navigation"
                    className="absolute right-2 top-3 z-10 flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
                <div className="h-full pr-8" onClick={closeOnLink}>
                    {sidebar(false, true)}
                </div>
            </dialog>

            {/* The page sits on a raised panel beside the sidebar. */}
            <CommandPalette
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                workspaces={workspaces}
                current={current}
            />

            <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
                <div className="min-h-[calc(100dvh-3.5rem)] bg-canvas lg:m-2 lg:ml-0 lg:min-h-[calc(100dvh-1rem)] lg:rounded-xl lg:border lg:border-border lg:shadow-[0_1px_2px_rgba(23,26,33,0.04),0_8px_24px_-12px_rgba(23,26,33,0.10)]">
                    {children}
                </div>
            </div>
        </div>
    );
}
