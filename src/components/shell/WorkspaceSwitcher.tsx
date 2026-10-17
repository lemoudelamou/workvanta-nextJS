"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";

import type { ShellWorkspace } from "@/lib/navigation/shell-data";
import { useDismiss } from "./use-dismiss";

export function workspaceInitials(name: string) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "W").slice(0, 2);
    return letters.toUpperCase();
}

const ROLE_LABEL: Record<ShellWorkspace["role"], string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    MEMBER: "Member",
    GUEST: "Guest",
};

export function WorkspaceSwitcher({
    workspaces,
    current,
    onNavigate,
}: {
    workspaces: ShellWorkspace[];
    current: ShellWorkspace | null;
    onNavigate?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const close = useCallback(() => setOpen(false), []);
    useDismiss(open, close, containerRef, triggerRef);

    function navigated() {
        setOpen(false);
        onNavigate?.();
    }

    const itemClass =
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted";

    return (
        <div ref={containerRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={current ? `Workspace: ${current.name}. Switch workspace` : "Choose a workspace"}
                className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-brand"
            >
                <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-[11px] font-semibold text-background"
                >
                    {current ? workspaceInitials(current.name) : "W"}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold leading-tight text-foreground">
                        {current?.name ?? "Workvanta"}
                    </span>
                    {current && (
                        <span className="block text-[11.5px] leading-tight text-muted-foreground">
                            {ROLE_LABEL[current.role]}
                        </span>
                    )}
                </span>
                <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label="Workspaces"
                    className="absolute inset-x-0 top-[calc(100%+4px)] z-50 rounded-lg border border-border bg-card p-1 shadow-[0_12px_32px_-8px_rgba(23,26,33,0.18)] motion-safe:animate-[shell-pop_120ms_ease-out]"
                >
                    {workspaces.length > 0 && (
                        <div className="max-h-64 overflow-y-auto">
                            {workspaces.map((workspace) => {
                                const selected = workspace.id === current?.id;
                                return (
                                    <Link
                                        key={workspace.id}
                                        href={`/workspace/${workspace.slug}`}
                                        role="menuitem"
                                        onClick={navigated}
                                        className={itemClass}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-semibold text-muted-foreground"
                                        >
                                            {workspaceInitials(workspace.name)}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                                        {selected && <Check className="size-3.5 text-brand" aria-label="Current" />}
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    <div className="my-1 h-px bg-border" />

                    <Link href="/workspace" role="menuitem" onClick={navigated} className={itemClass}>
                        <LayoutGrid className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        All workspaces
                    </Link>
                    <Link href="/workspace/new" role="menuitem" onClick={navigated} className={itemClass}>
                        <Plus className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        Create workspace
                    </Link>
                </div>
            )}
        </div>
    );
}
