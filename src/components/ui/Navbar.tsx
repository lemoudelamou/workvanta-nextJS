"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowUpRight,
    BarChart3,
    BriefcaseBusiness,
    ChevronDown,
    Home,
    LogOut,
    Settings,
} from "lucide-react";
import { glass, focusRing } from "@/app/style/ui-tokens";

import WorkvantaBrand from "@/components/ui/WorkvantaBrand";
import { logout } from "@/app/(auth)/signin/actions";
import {
    NotificationBell,
    type BellNotification,
} from "@/app/(app)/notifications/NotificationBell";

type NavbarProps = {
    session: {
        user?: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    } | null;
    isOwner?: boolean;
    unreadNotificationCount?: number;
    notifications?: BellNotification[];
};



export function Navbar({
                           session,
                           isOwner = false,
                           unreadNotificationCount = 0,
                           notifications = [],
                       }: NavbarProps) {
    const userName =
        session?.user?.name?.trim() ||
        session?.user?.email?.split("@")[0] ||
        "User";

    const userEmail = session?.user?.email ?? "";
    const userInitial = userName.charAt(0).toUpperCase() || "U";

    const links: {
        href: string;
        label: string;
        icon: ReactNode;
    }[] = [
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: <Home className="size-[15px]" />,
        },
        {
            href: "/workspace",
            label: "Workspace",
            icon: <BriefcaseBusiness className="size-[15px]" />,
        },
        ...(isOwner
            ? [
                {
                    href: "/analytics",
                    label: "Analytics",
                    icon: <BarChart3 className="size-[15px]" />,
                },
            ]
            : []),
    ];

    function handleSubmit() {
        localStorage.removeItem("workvanta-theme");
    }

    return (
        <header className="sticky top-0 z-50">
            <div className="relative">
                <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-2xl dark:border-white/[0.07] dark:bg-slate-950/80"
                />

                <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                    <WorkvantaBrand />

                    {session && (
                        <nav className="ml-8 hidden items-center gap-1 md:flex">
                            {links.map((link) => (
                                <NavLink
                                    key={link.href}
                                    href={link.href}
                                    icon={link.icon}
                                >
                                    {link.label}
                                </NavLink>
                            ))}
                        </nav>
                    )}

                    <div className="flex-1" />

                    {session ? (
                        <div className="flex items-center gap-2">
                            <NotificationBell
                                unreadCount={unreadNotificationCount}
                                notifications={notifications}
                            />

                            <UserMenu
                                userName={userName}
                                userEmail={userEmail}
                                userImage={session.user?.image}
                                userInitial={userInitial}
                                onLogout={handleSubmit}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <Link
                                href="/signup"
                                className={`rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`}
                            >
                                Sign up
                            </Link>

                            <Link
                                href="/signin"
                                className={`group inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 ${focusRing}`}
                            >
                                Sign in
                                <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                            </Link>
                        </div>
                    )}
                </div>

                {session && (
                    <div className="border-t border-slate-200/60 bg-slate-50/50 md:hidden dark:border-white/[0.06] dark:bg-white/[0.015]">
                        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
                            {links.map((link) => (
                                <MobileNavLink
                                    key={link.href}
                                    href={link.href}
                                    icon={link.icon}
                                >
                                    {link.label}
                                </MobileNavLink>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}


function UserMenu({
                      userName,
                      userEmail,
                      userImage,
                      userInitial,
                      onLogout,
                  }: {
    userName: string;
    userEmail: string;
    userImage?: string | null;
    userInitial: string;
    onLogout: () => void;
}) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <div ref={menuRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup="menu"
                className={`flex h-10 items-center gap-2 rounded-xl pl-1 pr-2.5 select-none ${glass} ${focusRing}`}
            >
                {userImage ? (
                    <Image
                        src={userImage}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 rounded-lg object-cover"
                    />
                ) : (
                    <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-white/[0.08] dark:text-white">
                        {userInitial}
                    </div>
                )}

                <div className="hidden max-w-[140px] text-left sm:block">
                    <p className="truncate text-xs font-semibold leading-4 text-slate-950 dark:text-white">
                        {userName}
                    </p>

                    <p className="truncate text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                        {userEmail}
                    </p>
                </div>

                <ChevronDown
                    className={`ml-1 size-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className={`absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-60 overflow-hidden rounded-2xl p-1.5 shadow-xl shadow-slate-950/10 ${glass}`}
                >
                    <div className="border-b border-slate-200/60 px-3 py-2.5 dark:border-white/[0.06]">
                        <p className="truncate text-xs font-semibold text-slate-950 dark:text-white">
                            {userName}
                        </p>

                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {userEmail}
                        </p>
                    </div>

                    <div className="py-1">
                        <Link
                            href="/settings"
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`}
                        >
                            <Settings className="size-4" />
                            Settings
                        </Link>

                        <form action={logout} onSubmit={onLogout}>
                            <button
                                type="submit"
                                role="menuitem"
                                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-400/[0.08] dark:hover:text-rose-300 ${focusRing}`}
                            >
                                <LogOut className="size-4" />
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}



function NavLink({
                     href,
                     children,
                     icon,
                 }: {
    href: string;
    children: ReactNode;
    icon?: ReactNode;
}) {
    return (
        <Link
            href={href}
            className={`group relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-900/[0.04] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`}
        >
            {icon}
            <span>{children}</span>
            <span className="absolute inset-x-3 -bottom-px h-px origin-center scale-x-0 bg-slate-950 transition-transform duration-200 group-hover:scale-x-100 dark:bg-white" />
        </Link>
    );
}

function MobileNavLink({
                           href,
                           children,
                           icon,
                       }: {
    href: string;
    children: ReactNode;
    icon?: ReactNode;
}) {
    return (
        <Link
            href={href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900/[0.04] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`}
        >
            {icon}
            {children}
        </Link>
    );
}

