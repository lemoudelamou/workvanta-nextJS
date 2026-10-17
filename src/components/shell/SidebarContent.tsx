"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CircleCheckBig, House, Inbox, LayoutDashboard, Lock, Plus, UsersRound } from "lucide-react";

import type { ShellWorkspace } from "@/lib/navigation/shell-data";
import { projectDot } from "@/lib/navigation/project-color";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { UserMenu, type ShellUser } from "./UserMenu";

const itemBase =
    "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand";
const itemIdle = "text-muted-foreground hover:bg-sidebar-hover hover:text-foreground";
const itemActive =
    "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(23,26,33,0.08),0_0_0_1px_rgba(23,26,33,0.04)] dark:bg-white/[0.07] dark:shadow-none";

function NavItem({
    href,
    icon,
    active,
    children,
    trailing,
    onNavigate,
}: {
    href: string;
    icon: ReactNode;
    active: boolean;
    children: ReactNode;
    trailing?: ReactNode;
    onNavigate?: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`${itemBase} ${active ? itemActive : itemIdle}`}
        >
            <span
                className={`flex size-4 shrink-0 items-center justify-center ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                aria-hidden="true"
            >
                {icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{children}</span>
            {trailing}
        </Link>
    );
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
    return (
        <div className="mb-1 flex h-6 items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">{children}</span>
            {action}
        </div>
    );
}

export function SidebarContent({
    pathname,
    workspaces,
    current,
    user,
    unreadCount,
    onNavigate,
}: {
    pathname: string;
    workspaces: ShellWorkspace[];
    current: ShellWorkspace | null;
    user: ShellUser;
    unreadCount: number;
    onNavigate?: () => void;
}) {
    const is = (href: string) => pathname === href;
    const under = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const base = current ? `/workspace/${current.slug}` : null;

    return (
        <div className="flex h-full flex-col">
            <div className="px-2.5 pt-2.5">
                <WorkspaceSwitcher workspaces={workspaces} current={current} onNavigate={onNavigate} />
            </div>

            <nav aria-label="Main" className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pb-3">
                <div className="space-y-0.5">
                    <NavItem href="/dashboard" icon={<House className="size-4" />} active={is("/dashboard")} onNavigate={onNavigate}>
                        Home
                    </NavItem>
                    <NavItem href="/tasks" icon={<CircleCheckBig className="size-4" />} active={under("/tasks")} onNavigate={onNavigate}>
                        My tasks
                    </NavItem>
                    <NavItem
                        href="/notifications"
                        icon={<Inbox className="size-4" />}
                        active={under("/notifications")}
                        onNavigate={onNavigate}
                        trailing={
                            unreadCount > 0 ? (
                                <span className="rounded-full bg-brand px-1.5 py-px text-[11px] font-semibold tabular-nums text-white dark:text-[#0f1115]">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                    <span className="sr-only"> unread</span>
                                </span>
                            ) : undefined
                        }
                    >
                        Inbox
                    </NavItem>
                </div>

                {current && base ? (
                    <>
                        <div className="mt-6 space-y-0.5">
                            <SectionLabel>Workspace</SectionLabel>
                            <NavItem href={base} icon={<LayoutDashboard className="size-4" />} active={is(base)} onNavigate={onNavigate}>
                                Overview
                            </NavItem>
                            <NavItem href={`${base}/team`} icon={<UsersRound className="size-4" />} active={under(`${base}/team`)} onNavigate={onNavigate}>
                                Team
                            </NavItem>
                        </div>

                        <div className="mt-6">
                            <SectionLabel
                                action={
                                    current.canCreateProjects ? (
                                        <Link
                                            href={`${base}/project/new`}
                                            onClick={onNavigate}
                                            aria-label="New project"
                                            title="New project"
                                            className="flex size-5 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:bg-sidebar-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
                                        >
                                            <Plus className="size-3.5" aria-hidden="true" />
                                        </Link>
                                    ) : undefined
                                }
                            >
                                Projects
                            </SectionLabel>

                            {current.projects.length === 0 ? (
                                <p className="px-2 py-1 text-[13px] leading-5 text-muted-foreground">
                                    No projects yet.
                                    {current.canCreateProjects && (
                                        <>
                                            {" "}
                                            <Link href={`${base}/project/new`} onClick={onNavigate} className="font-medium text-brand hover:underline">
                                                Create one
                                            </Link>
                                        </>
                                    )}
                                </p>
                            ) : (
                                <ul className="space-y-0.5">
                                    {current.projects.map((project) => {
                                        const href = `${base}/project/${project.id}`;
                                        return (
                                            <li key={project.id}>
                                                <NavItem
                                                    href={href}
                                                    active={under(href)}
                                                    onNavigate={onNavigate}
                                                    icon={<span className={`size-2 rounded-[3px] ${projectDot(project.id)}`} />}
                                                    trailing={
                                                        project.isPrivate ? (
                                                            <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Private" />
                                                        ) : undefined
                                                    }
                                                >
                                                    {project.name}
                                                </NavItem>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="mt-6 rounded-lg border border-dashed border-border px-3 py-3 text-[13px] leading-5 text-muted-foreground">
                        Create a workspace to start planning projects with your team.
                        <Link
                            href="/workspace/new"
                            onClick={onNavigate}
                            className="mt-2 flex items-center gap-1.5 font-medium text-brand hover:underline"
                        >
                            <Plus className="size-3.5" aria-hidden="true" />
                            Create workspace
                        </Link>
                    </div>
                )}
            </nav>

            <div className="border-t border-border/70 px-2.5 py-2.5">
                <UserMenu user={user} onNavigate={onNavigate} />
            </div>
        </div>
    );
}
