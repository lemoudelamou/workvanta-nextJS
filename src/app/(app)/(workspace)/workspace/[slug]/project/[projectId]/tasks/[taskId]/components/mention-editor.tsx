"use client";

import { useEffect, useId, useState, type KeyboardEvent, type RefObject } from "react";

import { personColor } from "@/lib/ui/person-color";
import { getInitials } from "./task-meta";

export type MentionMember = { id: string; name: string | null; email: string };

/*
 * Comments are stored as text with mentions written "@[Name](email)" (the
 * server reads the emails to notify people). People should never see that
 * syntax, so the editor is a contenteditable box where a mention is an
 * uneditable bold chip, and the text is converted back on save.
 */

const MENTION_MARKUP = /@\[([^\]]+)\]\(([^)\s]+)\)/g;
const TRIGGER = /(^|\s)@([^\s@]{0,40})$/;
const MAX_SUGGESTIONS = 6;

function mentionChip(name: string, email: string) {
    const chip = document.createElement("span");
    chip.contentEditable = "false";
    chip.dataset.mentionEmail = email;
    chip.dataset.mentionName = name;
    chip.className = "font-semibold text-foreground";
    chip.textContent = name;
    return chip;
}

/** Editor DOM -> stored text, with chips written back as mention markup. */
export function serializeEditor(root: Node): string {
    let out = "";
    const walk = (node: Node) => {
        node.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
                out += (child.textContent ?? "").replace(/ /g, " ");
            } else if (child instanceof HTMLElement) {
                if (child.dataset.mentionEmail) {
                    const name = (child.dataset.mentionName ?? child.textContent ?? "").replace(/[[\]]/g, "");
                    out += `@[${name}](${child.dataset.mentionEmail})`;
                } else if (child.tagName === "BR") {
                    out += "\n";
                } else {
                    // Some browsers wrap new lines in <div>s.
                    if ((child.tagName === "DIV" || child.tagName === "P") && out && !out.endsWith("\n")) out += "\n";
                    walk(child);
                }
            }
        });
    };
    walk(root);
    return out.replace(/\s+$/, "");
}

/** Stored text -> editor DOM. Built with text nodes, never innerHTML. */
export function fillEditor(root: HTMLElement, markup: string) {
    root.replaceChildren();
    let last = 0;
    for (const match of markup.matchAll(MENTION_MARKUP)) {
        const start = match.index ?? 0;
        if (start > last) root.append(document.createTextNode(markup.slice(last, start)));
        root.append(mentionChip(match[1], match[2]));
        last = start + match[0].length;
    }
    if (last < markup.length) root.append(document.createTextNode(markup.slice(last)));
}

/** Empty the editor and let it update its own state. */
export function clearEditor(root: HTMLElement) {
    root.replaceChildren();
    root.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Plain-text length as people see it (a mention counts as its name). */
export function visibleText(markup: string) {
    return markup.replace(MENTION_MARKUP, "$1");
}

type Trigger = { node: Text; end: number; query: string };

export function MentionEditor({
    editorRef,
    members,
    initialValue = "",
    placeholder,
    label,
    autoFocus,
    disabled,
    menuPlacement = "bottom",
    onChange,
    onSubmit,
    onCancel,
    className = "",
}: {
    editorRef: RefObject<HTMLDivElement | null>;
    members: MentionMember[];
    initialValue?: string;
    placeholder: string;
    label: string;
    autoFocus?: boolean;
    disabled?: boolean;
    /** Open the people list above the box (for a composer pinned to the bottom). */
    menuPlacement?: "top" | "bottom";
    onChange: (value: string) => void;
    /** Enter (Shift+Enter adds a line). */
    onSubmit: () => void;
    onCancel?: () => void;
    className?: string;
}) {
    const listId = useId();
    const [trigger, setTrigger] = useState<Trigger | null>(null);
    const [active, setActive] = useState(0);
    const [empty, setEmpty] = useState(!initialValue);

    useEffect(() => {
        const root = editorRef.current;
        if (!root) return;
        fillEditor(root, initialValue);
        if (autoFocus) {
            root.focus();
            const range = document.createRange();
            range.selectNodeContents(root);
            range.collapse(false);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
        // Only on mount: afterwards the DOM is the source of truth.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const query = trigger?.query.toLowerCase() ?? "";
    const suggestions = trigger
        ? members
              .filter((m) => m.name?.toLowerCase().includes(query) || m.email.toLowerCase().includes(query))
              .slice(0, MAX_SUGGESTIONS)
        : [];
    const open = suggestions.length > 0;

    function emit() {
        const root = editorRef.current;
        if (!root) return;
        const value = serializeEditor(root);
        setEmpty(value.trim() === "");
        onChange(value);
    }

    function findTrigger(): Trigger | null {
        const root = editorRef.current;
        const selection = window.getSelection();
        if (!root || !selection || !selection.isCollapsed || !selection.anchorNode) return null;
        const node = selection.anchorNode;
        if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
        const before = (node.textContent ?? "").slice(0, selection.anchorOffset).replace(/ /g, " ");
        const match = before.match(TRIGGER);
        return match ? { node: node as Text, end: selection.anchorOffset, query: match[2] } : null;
    }

    function handleInput() {
        emit();
        setTrigger(findTrigger());
        setActive(0);
    }

    function pick(member: MentionMember) {
        if (!trigger) return;
        const { node, end, query: typed } = trigger;
        const range = document.createRange();
        range.setStart(node, end - typed.length - 1);
        range.setEnd(node, end);
        range.deleteContents();

        const space = document.createTextNode(" ");
        range.insertNode(space);
        range.insertNode(mentionChip(member.name ?? member.email, member.email));

        const caret = document.createRange();
        caret.setStart(space, 1);
        caret.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(caret);

        setTrigger(null);
        editorRef.current?.focus();
        emit();
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (open) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive((i) => (i + step + suggestions.length) % suggestions.length);
                return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                pick(suggestions[active] ?? suggestions[0]);
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                setTrigger(null);
                return;
            }
        }
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onSubmit();
        } else if (event.key === "Escape" && onCancel) {
            event.preventDefault();
            onCancel();
        }
    }

    return (
        <div className="relative">
            <div
                ref={editorRef}
                role="textbox"
                aria-multiline="true"
                aria-label={label}
                aria-placeholder={placeholder}
                aria-disabled={disabled || undefined}
                aria-autocomplete="list"
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open ? `${listId}-${active}` : undefined}
                contentEditable={disabled ? "false" : "plaintext-only"}
                suppressContentEditableWarning
                data-empty={empty}
                onInput={handleInput}
                onKeyDown={onKeyDown}
                onKeyUp={(event) => {
                    if (event.key === "ArrowLeft" || event.key === "ArrowRight") setTrigger(findTrigger());
                }}
                onBlur={() => setTimeout(() => setTrigger(null), 120)}
                onPaste={(event) => {
                    // Keep pasted content as plain text.
                    event.preventDefault();
                    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
                }}
                className={`relative whitespace-pre-wrap break-words outline-none before:pointer-events-none data-[empty=true]:before:absolute data-[empty=true]:before:text-muted-foreground data-[empty=true]:before:content-[attr(aria-placeholder)] ${className}`}
            />

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="People"
                    className={`absolute left-0 z-[100] w-72 max-w-full overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[0_16px_40px_-12px_rgba(15,17,21,0.3)] ${
                        menuPlacement === "top" ? "bottom-full mb-3" : "top-full mt-2"
                    }`}
                >
                    {suggestions.map((member, index) => (
                        <li
                            key={member.id}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === active}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseMove={() => setActive(index)}
                            onClick={() => pick(member)}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                                index === active ? "bg-brand-soft dark:bg-brand/15" : ""
                            }`}
                        >
                            <span
                                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${personColor(member.email)}`}
                            >
                                {getInitials(member.name, member.email)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-foreground">
                                    {member.name ?? member.email}
                                </span>
                                {member.name && (
                                    <span className="block truncate text-[11px] text-muted-foreground">{member.email}</span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
