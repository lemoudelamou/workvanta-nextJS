/**
 * The app's keyboard shortcuts, in one place: the shortcuts panel, the
 * guide and the key handler all read this list, so they can't disagree.
 */
export type Shortcut = {
    /** "Mod" is Ctrl, or ⌘ on a Mac. */
    keys: string[];
    /** Press the keys one after the other (G then H), not together. */
    sequence?: boolean;
    label: string;
    group: "General" | "Go to";
};

/** "G" then one of these letters goes somewhere. "projects" means the current workspace. */
export const GO_TO_KEYS = {
    h: { label: "Home", href: "/dashboard" },
    t: { label: "My tasks", href: "/tasks" },
    n: { label: "Notifications", href: "/notifications" },
    w: { label: "All workspaces", href: "/workspace" },
    p: { label: "Projects in this workspace", href: "projects" },
    s: { label: "Settings", href: "/settings" },
} as const;

export type GoToKey = keyof typeof GO_TO_KEYS;

export const SHORTCUTS: Shortcut[] = [
    { group: "General", keys: ["Mod", "K"], label: "Search and jump to anything" },
    { group: "General", keys: ["?"], label: "Show keyboard shortcuts" },
    { group: "General", keys: ["["], label: "Collapse or expand the sidebar" },
    { group: "General", keys: ["Esc"], label: "Close a menu or dialog" },
    ...Object.entries(GO_TO_KEYS).map(([key, target]) => ({
        group: "Go to" as const,
        keys: ["G", key.toUpperCase()],
        sequence: true,
        label: target.label,
    })),
];

/** Where "G" then `key` leads, or null. `workspaceBase` is the current workspace's address. */
export function goToHref(key: string, workspaceBase: string | null): string | null {
    const target = GO_TO_KEYS[key.toLowerCase() as GoToKey];
    if (!target) return null;
    if (target.href === "projects") return workspaceBase ?? "/workspace";
    return target.href;
}

/** Shortcuts never fire while someone is typing. */
export function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Is this a browser or system command (⌘ anything, Ctrl+letter) rather than
 * a character? Alt Gr (reported as Ctrl+Alt on Windows) and Option on a Mac
 * type characters like "[" on French, German and other layouts, so those
 * still count as typing a character.
 */
export function isCommandKey(event: Pick<KeyboardEvent, "metaKey" | "ctrlKey" | "altKey">) {
    return event.metaKey || (event.ctrlKey && !event.altKey);
}

/** Event other parts of the app dispatch to open the shortcuts panel. */
export const SHOW_SHORTCUTS_EVENT = "workvanta:show-shortcuts";
