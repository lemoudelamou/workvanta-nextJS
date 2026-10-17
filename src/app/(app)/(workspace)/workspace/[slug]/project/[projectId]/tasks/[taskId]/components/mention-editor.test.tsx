/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";

import { fillEditor, MentionEditor, serializeEditor, visibleText } from "./mention-editor";

const members = [
    { id: "u1", name: "Daghar Mourad", email: "daghar@x.com" },
    { id: "u2", name: "Ada Lovelace", email: "ada@x.com" },
];

describe("serializing the editor", () => {
    it("round-trips text and mentions", () => {
        const root = document.createElement("div");
        const markup = "Hi @[Daghar Mourad](daghar@x.com), see\nline two @[Ada Lovelace](ada@x.com)";
        fillEditor(root, markup);

        expect(root.textContent).toBe("Hi Daghar Mourad, see\nline two Ada Lovelace");
        expect(root.querySelector("[data-mention-email]")).toHaveClass("font-semibold");
        expect(serializeEditor(root)).toBe(markup);
    });

    it("never parses stored text as HTML", () => {
        const root = document.createElement("div");
        fillEditor(root, "<img src=x onerror=alert(1)>");
        expect(root.querySelector("img")).toBeNull();
        expect(root.textContent).toBe("<img src=x onerror=alert(1)>");
    });

    it("turns line-break elements and non-breaking spaces into plain text", () => {
        const root = document.createElement("div");
        root.innerHTML = "a b<br>c<div>d</div><br>";
        expect(serializeEditor(root)).toBe("a b\nc\nd");
    });

    it("counts a mention by its name", () => {
        expect(visibleText("Hi @[Ada Lovelace](ada@x.com)")).toBe("Hi Ada Lovelace");
    });
});

function Harness({ onChange, onSubmit }: { onChange: (v: string) => void; onSubmit: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    return (
        <MentionEditor
            editorRef={ref}
            members={members}
            label="Comment"
            placeholder="Write a comment"
            onChange={onChange}
            onSubmit={onSubmit}
        />
    );
}

function typeAtEnd(box: HTMLElement, text: string) {
    const node = document.createTextNode(text);
    box.append(node);
    const range = document.createRange();
    range.setStart(node, text.length);
    range.collapse(true);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent.input(box);
}

describe("MentionEditor", () => {
    it("suggests people after @ and inserts the picked one as a bold name", () => {
        const onChange = jest.fn();
        render(<Harness onChange={onChange} onSubmit={jest.fn()} />);
        const box = screen.getByRole("textbox", { name: "Comment" });

        typeAtEnd(box, "Ping @dag");
        expect(screen.getAllByRole("option")).toHaveLength(1);

        act(() => {
            fireEvent.click(screen.getByRole("option", { name: /Daghar Mourad/ }));
        });

        expect(box).toHaveTextContent("Ping Daghar Mourad");
        expect(box.textContent).not.toContain("@");
        expect(onChange).toHaveBeenLastCalledWith("Ping @[Daghar Mourad](daghar@x.com)");
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("picks with the keyboard", () => {
        const onChange = jest.fn();
        render(<Harness onChange={onChange} onSubmit={jest.fn()} />);
        const box = screen.getByRole("textbox", { name: "Comment" });

        typeAtEnd(box, "@");
        fireEvent.keyDown(box, { key: "ArrowDown" });
        act(() => {
            fireEvent.keyDown(box, { key: "Enter" });
        });

        expect(onChange).toHaveBeenLastCalledWith("@[Ada Lovelace](ada@x.com)");
    });

    it("sends on Enter but not on Shift+Enter", () => {
        const onSubmit = jest.fn();
        render(<Harness onChange={jest.fn()} onSubmit={onSubmit} />);
        const box = screen.getByRole("textbox", { name: "Comment" });

        fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
        expect(onSubmit).not.toHaveBeenCalled();
        fireEvent.keyDown(box, { key: "Enter" });
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});
