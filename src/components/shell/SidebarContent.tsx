"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
    Bell,
    CircleCheckBig,
    FolderKanban,
    House,
    Lock,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    Search,
    Settings,
    UsersRound,
} from "lucide-react";

import type { ShellWorkspace } from "@/lib/navigation/shell-data";
import { projectDot } from "@/lib/navigation/project-color";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserMenu, type ShellUser } from "./UserMenu";

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-brand";

/**
 * Hover/focus label for the collapsed rail, where items show only an icon.
 * Hidden from assistive tech: the link already carries the same name.
 */
function RailTooltip({ label }: { label: string }) {
    return (
        <span
            aria-hidden="true"
            className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
            {label}
        </span>
    );
}

function Count({ value, tone = "muted" }: { value: number; tone?: "muted" | "brand" }) {
    if (value <= 0) return null;
    return (
        <span
            className={
                tone === "brand"
                    ? "min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] font-semibold leading-[18px] tabular-nums text-white dark:text-[#0f1115]"
                    : "min-w-5 text-right text-xs tabular-nums text-muted-foreground"
            }
        >
            {value > 99 ? "99+" : value}
        </span>
    );
}

function NavItem({
    href,
    icon,
    label,
    active,
    collapsed,
    count,
    countTone,
    trailing,
    srExtra,
}: {
    href: string;
    icon: ReactNode;
    label: string;
    active: boolean;
    collapsed: boolean;
    count?: number;
    countTone?: "muted" | "brand";
    trailing?: ReactNode;
    /** Extra words for screen readers, e.g. "3 unread". */
    srExtra?: string;
}) {
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? [label, srExtra].filter(Boolean).join(", ") : undefined}
            // The rail's nav scrolls, which would clip a custom tooltip.
            title={collapsed ? label : undefined}
            className={`group relative flex h-9 items-center gap-3 rounded-lg text-sm transition-colors ${focusRing} ${
                collapsed ? "justify-center px-0" : "px-2.5"
            } ${
                active
                    ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(23,26,33,0.08),0_0_0_1px_rgba(23,26,33,0.05)] dark:bg-white/[0.08] dark:shadow-none"
                    : "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground"
            }`}
        >
            {active && !collapsed && (
                <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand" />
            )}
            <span
                aria-hidden="true"
                className={`relative flex size-[18px] shrink-0 items-center justify-center ${
                    active ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
                }`}
            >
                {icon}
                {collapsed && count !== undefined && count > 0 && countTone === "brand" && (
                    <span className="absolute -right-1 -top-1 size-2 rounded-full bg-brand ring-2 ring-sidebar" />
                )}
            </span>
            {collapsed ? null : (
                <>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {trailing}
                    {count !== undefined && (
                        <>
                            <Count value={count} tone={countTone} />
                            {srExtra && count > 0 && <span className="sr-only">{srExtra}</span>}
                        </>
                    )}
                </>
            )}
        </Link>
    );
}

function Section({
    title,
    action,
    collapsed,
    children,
}: {
    title: string;
    action?: ReactNode;
    collapsed: boolean;
    children: ReactNode;
}) {
    return (
        <div className="mt-5">
            {collapsed ? (
                <div aria-hidden="true" className="mx-auto mb-2 h-px w-6 bg-border" />
            ) : (
                <div className="mb-1 flex h-6 items-center justify-between pl-2.5 pr-1">
                    <h2 className="truncate text-xs font-semibold text-muted-foreground/90">{title}</h2>
                    {action}
                </div>
            )}
            <div className="space-y-0.5">{children}</div>
        </div>
    );
}

export function SidebarContent({
    pathname,
    workspaces,
    current,
    user,
    unreadCount,
    myOpenTasks,
    collapsed = false,
    onToggleCollapsed,
    onOpenSearch,
}: {
    pathname: string;
    workspaces: ShellWorkspace[];
    current: ShellWorkspace | null;
    user: ShellUser;
    unreadCount: number;
    myOpenTasks: number;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    onOpenSearch?: () => void;
}) {
    const is = (href: string) => pathname === href;
    const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const base = current ? `/workspace/${current.slug}` : null;
    const newProjectHref = base ? `${base}/project/new` : null;

    return (
        <div className="flex h-full flex-col">
            <div className={collapsed ? "px-2 pt-3" : "px-3 pt-3"}>
                <WorkspaceSwitcher workspaces={workspaces} current={current} compact={collapsed} />

                {onOpenSearch && (
                    <button
                        type="button"
                        onClick={onOpenSearch}
                        aria-label="Search and jump to…"
                        aria-keyshortcuts="Control+K Meta+K"
                        className={`group relative mt-3 flex h-9 w-full items-center gap-2.5 rounded-lg border border-border bg-card text-sm text-muted-foreground shadow-[0_1px_2px_rgba(23,26,33,0.04)] transition-colors hover:border-foreground/20 hover:text-foreground ${focusRing} ${
                            collapsed ? "justify-center" : "px-2.5"
                        }`}
                    >
                        <Search className="size-4 shrink-0" aria-hidden="true" />
                        {collapsed ? (
                            <RailTooltip label="Search (Ctrl K)" />
                        ) : (
                            <>
                                <span className="flex-1 text-left">Search…</span>
                                <kbd className="rounded border border-border bg-muted px-1.5 font-sans text-[10.5px] font-medium text-muted-foreground">
                                    Ctrl K
                                </kbd>
                            </>
                        )}
                    </button>
                )}
            </div>

            <nav
                aria-label="Main"
                className={`flex min-h-0 flex-1 flex-col overflow-y-auto pb-3 ${collapsed ? "px-2" : "px-3"}`}
            >
                <Section title="Your work" collapsed={collapsed}>
                    <NavItem href="/dashboard" icon={<House className="size-[18px]" />} label="Home" active={is("/dashboard")} collapsed={collapsed} />
                    <NavItem
                        href="/tasks"
                        icon={<CircleCheckBig className="size-[18px]" />}
                        label="My tasks"
                        active={under("/tasks")}
                        collapsed={collapsed}
                        count={myOpenTasks}
                        srExtra={`${myOpenTasks} open`}
                    />
                    <NavItem
                        href="/notifications"
                        icon={<Bell className="size-[18px]" />}
                        label="Notifications"
                        active={under("/notifications")}
                        collapsed={collapsed}
                        count={unreadCount}
                        countTone="brand"
                        srExtra={`${unreadCount} unread`}
                    />
                </Section>

                {current && base ? (
                    <>
                        <Section title={current.name} collapsed={collapsed}>
                            <NavItem
                                href={base}
                                icon={<FolderKanban className="size-[18px]" />}
                                label="All projects"
                                active={is(base)}
                                collapsed={collapsed}
                                count={current.projects.length}
                            />
                            <NavItem
                                href={`${base}/team`}
                                icon={<UsersRound className="size-[18px]" />}
                                label="Team & invites"
                                active={under(`${base}/team`)}
                                collapsed={collapsed}
                                count={current.memberCount}
                            />
                        </Section>

                        <Section
                            title="Projects"
                            collapsed={collapsed}
                            action={
                                current.canCreateProjects && newProjectHref ? (
                                    <Link
                                        href={newProjectHref}
                                        aria-label="New project"
                                        title="New project"
                                        className={`flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground ${focusRing}`}
                                    >
                                        <Plus className="size-4" aria-hidden="true" />
                                    </Link>
                                ) : undefined
                            }
                        >
                            {current.projects.length === 0 && !collapsed && (
                                <p className="px-2.5 py-1 text-[13px] leading-5 text-muted-foreground">No projects yet.</p>
                            )}
                            <ul className="space-y-0.5">
                                {current.projects.map((project) => {
                                    const href = `${base}/project/${project.id}`;
                                    return (
                                        <li key={project.id}>
                                            <NavItem
                                                href={href}
                                                label={project.name}
                                                active={under(href)}
                                                collapsed={collapsed}
                                                count={project.openTasks}
                                                srExtra={`${project.openTasks} open tasks`}
                                                icon={<span className={`size-2.5 rounded-[3px] ${projectDot(project.id)}`} />}
                                                trailing={
                                                    project.isPrivate ? (
                                                        <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Private" />
                                                    ) : undefined
                                                }
                                            />
                                        </li>
                                    );
                                })}
                            </ul>
                            {current.canCreateProjects && newProjectHref && !collapsed && (
                                <Link
                                    href={newProjectHref}
                                    className={`mt-0.5 flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground ${focusRing}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="flex size-[18px] items-center justify-center rounded-[5px] border border-dashed border-muted-foreground/50"
                                    >
                                        <Plus className="size-3" />
                                    </span>
                                    New project
                                </Link>
                            )}
                        </Section>
                    </>
                ) : (
                    !collapsed && (
                        <div className="mt-6 rounded-lg border border-dashed border-border px-3 py-3 text-[13px] leading-5 text-muted-foreground">
                            Create a workspace to start planning projects with your team.
                            <Link href="/workspace/new" className="mt-2 flex items-center gap-1.5 font-medium text-brand hover:underline">
                                <Plus className="size-3.5" aria-hidden="true" />
                                Create workspace
                            </Link>
                        </div>
                    )
                )}
            </nav>

            <div className={`space-y-1 border-t border-border/70 py-2.5 ${collapsed ? "px-2" : "px-3"}`}>
                <NavItem
                    href="/settings"
                    icon={<Settings className="size-[18px]" />}
                    label="Settings"
                    active={under("/settings")}
                    collapsed={collapsed}
                />
                <UserMenu user={user} compact={collapsed} />
                {onToggleCollapsed && (
                    <button
                        type="button"
                        onClick={onToggleCollapsed}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-expanded={!collapsed}
                        className={`group relative flex h-8 w-full items-center gap-3 rounded-lg text-xs text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground ${focusRing} ${
                            collapsed ? "justify-center" : "px-2.5"
                        }`}
                    >
                        {collapsed ? (
                            <>
                                <PanelLeftOpen className="size-4" aria-hidden="true" />
                                <RailTooltip label="Expand sidebar" />
                            </>
                        ) : (
                            <>
                                <PanelLeftClose className="size-4" aria-hidden="true" />
                                Collapse
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
