"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";

import { logout } from "@/app/(auth)/signin/actions";
import { useDismiss } from "./use-dismiss";
import { personColor } from "@/lib/ui/person-color";

export type ShellUser = {
    name: string;
    email: string;
    image?: string | null;
};

export function UserAvatar({ user, size = "size-7" }: { user: ShellUser; size?: string }) {
    if (user.image) {
        return (
            <Image
                src={user.image}
                alt=""
                width={28}
                height={28}
                className={`${size} shrink-0 rounded-full object-cover`}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className={`${size} flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${personColor(user.email)}`}
        >
            {(user.name.charAt(0) || "U").toUpperCase()}
        </span>
    );
}

export function UserMenu({
    user,
    onNavigate,
    compact = false,
}: {
    user: ShellUser;
    onNavigate?: () => void;
    /** Avatar only, for the collapsed sidebar. */
    compact?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const close = useCallback(() => setOpen(false), []);
    useDismiss(open, close, containerRef, triggerRef);

    const itemClass =
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] outline-none transition-colors";

    return (
        <div ref={containerRef} className="relative">
            {open && (
                <div
                    role="menu"
                    aria-label="Account"
                    className={`absolute bottom-[calc(100%+4px)] z-50 ${compact ? "left-0 w-60" : "inset-x-0"} rounded-lg border border-border bg-card p-1 shadow-[0_12px_32px_-8px_rgba(23,26,33,0.18)] motion-safe:animate-[shell-pop_120ms_ease-out]`}
                >
                    <div className="px-2 py-1.5">
                        <p className="truncate text-[13px] font-medium text-foreground">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    <Link
                        href="/settings"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            onNavigate?.();
                        }}
                        className={`${itemClass} text-foreground hover:bg-muted focus-visible:bg-muted`}
                    >
                        <Settings className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        Settings
                    </Link>
                    <form
                        action={async () => {
                            // The theme preference belongs to the account; don't
                            // carry it over to whoever signs in next.
                            try {
                                localStorage.removeItem("workvanta-theme");
                            } catch {}
                            await logout();
                        }}
                    >
                        <button
                            type="submit"
                            role="menuitem"
                            className={`${itemClass} text-foreground hover:bg-danger/[0.07] hover:text-danger focus-visible:bg-danger/[0.07]`}
                        >
                            <LogOut className="size-3.5" aria-hidden="true" />
                            Sign out
                        </button>
                    </form>
                </div>
            )}

            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Account: ${user.name}`}
                title={compact ? user.name : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-brand ${compact ? "justify-center" : ""}`}
            >
                <UserAvatar user={user} />
                {!compact && (
                <>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium leading-tight text-foreground">
                        {user.name}
                    </span>
                    <span className="block truncate text-[11.5px] leading-tight text-muted-foreground">
                        {user.email}
                    </span>
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </>
                )}
            </button>
        </div>
    );
}
