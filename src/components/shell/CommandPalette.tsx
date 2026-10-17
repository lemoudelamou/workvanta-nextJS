"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Bell,
    CircleCheckBig,
    CornerDownLeft,
    FolderKanban,
    House,
    LayoutGrid,
    Plus,
    Search,
    Settings,
    UsersRound,
} from "lucide-react";

import type { ShellWorkspace } from "@/lib/navigation/shell-data";
import { projectDot } from "@/lib/navigation/project-color";
import { workspaceInitials } from "./WorkspaceSwitcher";

export type PaletteItem = {
    id: string;
    group: "Go to" | "Projects" | "Workspaces" | "Create";
    label: string;
    /** Shown dimmed after the label, e.g. the workspace a project is in. */
    hint?: string;
    href: string;
    icon: ReactNode;
    /** Extra words that should match, e.g. "inbox" for Notifications. */
    keywords?: string;
};

const GROUP_ORDER: PaletteItem["group"][] = ["Go to", "Projects", "Workspaces", "Create"];

/** Everything the palette can jump to, current workspace first. */
export function buildPaletteItems(workspaces: ShellWorkspace[], current: ShellWorkspace | null): PaletteItem[] {
    const items: PaletteItem[] = [
        { id: "home", group: "Go to", label: "Home", href: "/dashboard", icon: <House className="size-4" />, keywords: "dashboard overview" },
        { id: "tasks", group: "Go to", label: "My tasks", href: "/tasks", icon: <CircleCheckBig className="size-4" />, keywords: "assigned todo" },
        { id: "notifications", group: "Go to", label: "Notifications", href: "/notifications", icon: <Bell className="size-4" />, keywords: "inbox alerts" },
        { id: "settings", group: "Go to", label: "Settings", href: "/settings", icon: <Settings className="size-4" />, keywords: "profile account password theme" },
    ];

    if (current) {
        items.push(
            { id: `ws-${current.id}-projects`, group: "Go to", label: "All projects", hint: current.name, href: `/workspace/${current.slug}`, icon: <FolderKanban className="size-4" /> },
            { id: `ws-${current.id}-team`, group: "Go to", label: "Team & invites", hint: current.name, href: `/workspace/${current.slug}/team`, icon: <UsersRound className="size-4" />, keywords: "members people invite" },
        );
    }

    const ordered = current ? [current, ...workspaces.filter((w) => w.id !== current.id)] : workspaces;
    for (const workspace of ordered) {
        for (const project of workspace.projects) {
            items.push({
                id: `project-${project.id}`,
                group: "Projects",
                label: project.name,
                hint: workspace.name,
                href: `/workspace/${workspace.slug}/project/${project.id}`,
                icon: <span className={`size-2.5 rounded-[3px] ${projectDot(project.id)}`} />,
            });
        }
    }

    for (const workspace of workspaces) {
        items.push({
            id: `workspace-${workspace.id}`,
            group: "Workspaces",
            label: workspace.name,
            href: `/workspace/${workspace.slug}`,
            icon: (
                <span className="flex size-4 items-center justify-center rounded bg-muted text-[8px] font-semibold text-muted-foreground">
                    {workspaceInitials(workspace.name)}
                </span>
            ),
            keywords: "switch",
        });
    }

    if (current?.canCreateProjects) {
        items.push({ id: "new-project", group: "Create", label: "New project", hint: current.name, href: `/workspace/${current.slug}/project/new`, icon: <Plus className="size-4" />, keywords: "create add" });
    }
    items.push(
        { id: "new-workspace", group: "Create", label: "New workspace", href: "/workspace/new", icon: <Plus className="size-4" />, keywords: "create add team" },
        { id: "all-workspaces", group: "Go to", label: "All workspaces", href: "/workspace", icon: <LayoutGrid className="size-4" /> },
    );

    return items;
}

/**
 * Matches every word of the query against the label, hint and keywords.
 * Labels that start with the query rank first.
 */
export function filterPaletteItems(items: PaletteItem[], query: string) {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return items;

    return items
        .map((item) => {
            const label = item.label.toLowerCase();
            const haystack = `${label} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase();
            if (!words.every((word) => haystack.includes(word))) return null;
            const score = label.startsWith(words[0]) ? 0 : label.includes(words[0]) ? 1 : 2;
            return { item, score };
        })
        .filter((entry): entry is { item: PaletteItem; score: number } => entry !== null)
        .sort((a, b) => a.score - b.score)
        .map((entry) => entry.item);
}

export function CommandPalette({
    open,
    onClose,
    workspaces,
    current,
}: {
    open: boolean;
    onClose: () => void;
    workspaces: ShellWorkspace[];
    current: ShellWorkspace | null;
}) {
    const router = useRouter();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const listId = useId();

    const all = useMemo(() => buildPaletteItems(workspaces, current), [workspaces, current]);
    const results = useMemo(() => filterPaletteItems(all, query), [all, query]);

    // Group for display while keeping one flat order for the keyboard.
    const grouped = useMemo(() => {
        if (query.trim()) return [{ group: null as string | null, items: results }];
        return GROUP_ORDER.map((group) => ({ group: group as string | null, items: results.filter((r) => r.group === group) })).filter((g) => g.items.length);
    }, [results, query]);
    const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
    }, [active]);

    function reset() {
        setQuery("");
        setActive(0);
    }

    function go(item: PaletteItem | undefined) {
        if (!item) return;
        onClose();
        reset();
        router.push(item.href);
    }

    function onKeyDown(event: React.KeyboardEvent) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (flat.length ? (index + 1) % flat.length : 0));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (flat.length ? (index - 1 + flat.length) % flat.length : 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            go(flat[active]);
        }
    }

    const activeId = flat[active] ? `${listId}-${flat[active].id}` : undefined;

    return (
        <dialog
            ref={dialogRef}
            aria-label="Search and jump to"
            onClose={() => {
                onClose();
                reset();
            }}
            onClick={(event) => {
                // Clicking the dimmed backdrop closes the palette.
                if (event.target === event.currentTarget) event.currentTarget.close();
            }}
            className="m-0 mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl border border-border bg-card p-0 text-foreground shadow-[0_24px_64px_-12px_rgba(15,17,21,0.35)] backdrop:bg-[#0f1115]/40 backdrop:backdrop-blur-[2px] open:motion-safe:animate-[shell-pop_140ms_ease-out]"
        >
            <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                    autoFocus
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(0);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder="Search pages, projects and workspaces…"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-activedescendant={activeId}
                    aria-autocomplete="list"
                    className="h-12 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded border border-border bg-muted px-1.5 font-sans text-[10.5px] text-muted-foreground">Esc</kbd>
            </div>

            <ul ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
                {flat.length === 0 && (
                    <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                        Nothing matches “{query.trim()}”.
                    </li>
                )}
                {grouped.map(({ group, items }) => (
                    <li key={group ?? "results"} role="presentation">
                        {group && <div className="px-2.5 pb-1 pt-2.5 text-xs font-medium text-muted-foreground">{group}</div>}
                        <ul role="presentation">
                            {items.map((item) => {
                                const index = flat.indexOf(item);
                                const selected = index === active;
                                return (
                                    <li
                                        key={item.id}
                                        id={`${listId}-${item.id}`}
                                        role="option"
                                        aria-selected={selected}
                                        onMouseMove={() => setActive(index)}
                                        onClick={() => go(item)}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm ${
                                            selected ? "bg-brand-soft text-foreground dark:bg-brand/15" : "text-foreground"
                                        }`}
                                    >
                                        <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center ${selected ? "text-brand" : "text-muted-foreground"}`}>
                                            {item.icon}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">
                                            {item.label}
                                            {item.hint && <span className="ml-2 text-xs text-muted-foreground">{item.hint}</span>}
                                        </span>
                                        {selected && (
                                            <span aria-hidden="true" className="flex items-center gap-1 text-xs text-muted-foreground">
                                                {item.group === "Create" ? <Plus className="size-3" /> : <ArrowRight className="size-3" />}
                                                <CornerDownLeft className="size-3" />
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                ))}
            </ul>

            <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-4 py-2 text-[11.5px] text-muted-foreground">
                <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to move</span>
                <span><kbd className="font-sans">Enter</kbd> to open</span>
                <span><kbd className="font-sans">Esc</kbd> to close</span>
            </div>
        </dialog>
    );
}
