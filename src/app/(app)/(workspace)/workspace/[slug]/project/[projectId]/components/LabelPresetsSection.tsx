"use client";

import { useState, useTransition } from "react";
import { Check, Plus, RotateCcw, X } from "lucide-react";

import {
    LABEL_COLORS,
    LABEL_NAME_MAX,
    labelColor,
    nextLabelColor,
    PRESET_MAX,
    type PresetLabel,
} from "@/lib/labels/label-colors";
import { setLabelPresetsAction } from "../label-actions";

/**
 * The labels offered under "Suggested" in every task's label menu. Admins
 * add, rename, recolour and remove them; each change saves straight away.
 */
export function LabelPresetsSection({
    slug,
    projectId,
    presets: initial,
    customized: initialCustomized,
}: {
    slug: string;
    projectId: string;
    presets: PresetLabel[];
    /** False while the project uses the app's default list. */
    customized: boolean;
}) {
    const [presets, setPresets] = useState(initial);
    const [customized, setCustomized] = useState(initialCustomized);
    const [picking, setPicking] = useState<number | null>(null);
    const [newName, setNewName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function save(next: PresetLabel[] | null) {
        const previous = { presets, customized };
        if (next) {
            setPresets(next);
            setCustomized(true);
        }
        setError(null);
        startTransition(async () => {
            const result = await setLabelPresetsAction(slug, projectId, next);
            if (result.error !== undefined) {
                setPresets(previous.presets);
                setCustomized(previous.customized);
                setError(result.error);
                return;
            }
            setPresets(result.presets);
            setCustomized(next !== null);
        });
    }

    const update = (index: number, change: Partial<PresetLabel>) =>
        save(presets.map((p, i) => (i === index ? { ...p, ...change } : p)));

    function add() {
        const name = newName.trim().replace(/\s+/g, " ");
        if (!name) return;
        save([...presets, { name, color: nextLabelColor(presets.map((p) => p.color)) }]);
        setNewName("");
    }

    return (
        <section aria-labelledby="presets-heading" className="border-t border-border px-5 py-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 id="presets-heading" className="text-sm font-semibold text-foreground">
                        Suggested labels
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Offered in every task&apos;s label menu.{" "}
                        {customized ? "This project has its own list." : "These are the defaults."}
                    </p>
                </div>
                {customized && (
                    <button
                        type="button"
                        onClick={() => save(null)}
                        disabled={isPending}
                        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                    >
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        Reset to defaults
                    </button>
                )}
            </div>

            <ul aria-label="Suggested labels" className="mt-3 flex max-h-56 flex-col gap-1 overflow-y-auto">
                {presets.map((preset, index) => (
                    <PresetRow
                        key={`${index}-${preset.name}`}
                        preset={preset}
                        picking={picking === index}
                        disabled={isPending}
                        onTogglePicker={() => setPicking((p) => (p === index ? null : index))}
                        onRename={(name) => name.trim() && name.trim() !== preset.name && update(index, { name })}
                        onRecolor={(color) => {
                            setPicking(null);
                            if (color !== preset.color) update(index, { color });
                        }}
                        onRemove={() => save(presets.filter((_, i) => i !== index))}
                    />
                ))}
                {presets.length === 0 && (
                    <li className="px-1 py-2 text-xs text-muted-foreground">No suggestions. Add one below.</li>
                )}
            </ul>

            {presets.length < PRESET_MAX && (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        add();
                    }}
                    className="mt-2 flex gap-2"
                >
                    <label htmlFor="new-preset" className="sr-only">
                        New suggested label
                    </label>
                    <input
                        id="new-preset"
                        value={newName}
                        maxLength={LABEL_NAME_MAX}
                        onChange={(event) => {
                            setNewName(event.target.value);
                            setError(null);
                        }}
                        placeholder="Add a suggestion"
                        className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-brand focus:ring-4 focus:ring-brand/15"
                    />
                    <button
                        type="submit"
                        disabled={isPending || !newName.trim()}
                        aria-label="Add suggestion"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                    >
                        <Plus className="size-4" aria-hidden="true" />
                    </button>
                </form>
            )}

            {(error || isPending) && (
                <p
                    role={error ? "alert" : "status"}
                    className={`mt-2 text-xs ${error ? "font-medium text-danger" : "text-muted-foreground"}`}
                >
                    {error ?? "Saving…"}
                </p>
            )}
        </section>
    );
}

function PresetRow({
    preset,
    picking,
    disabled,
    onTogglePicker,
    onRename,
    onRecolor,
    onRemove,
}: {
    preset: PresetLabel;
    picking: boolean;
    disabled: boolean;
    onTogglePicker: () => void;
    onRename: (name: string) => void;
    onRecolor: (color: PresetLabel["color"]) => void;
    onRemove: () => void;
}) {
    const [name, setName] = useState(preset.name);
    const colour = labelColor(preset.color);

    return (
        <li>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onTogglePicker}
                    aria-expanded={picking}
                    aria-label={`Colour of ${preset.name}: ${colour.name}`}
                    title="Change colour"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <span aria-hidden="true" className={`size-3 rounded-full ${colour.dot}`} />
                </button>
                <input
                    aria-label={`Name of suggestion ${preset.name}`}
                    value={name}
                    maxLength={LABEL_NAME_MAX}
                    disabled={disabled}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() => {
                        if (!name.trim()) setName(preset.name);
                        else onRename(name);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                        } else if (event.key === "Escape") {
                            event.stopPropagation();
                            setName(preset.name);
                        }
                    }}
                    className="h-8 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm text-foreground outline-none transition-colors hover:border-border focus:border-brand focus:ring-4 focus:ring-brand/15"
                />
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disabled}
                    aria-label={`Remove suggestion ${preset.name}`}
                    title="Remove suggestion"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>
            {picking && (
                <div role="radiogroup" aria-label={`Colour of ${preset.name}`} className="mb-1 mt-1 flex flex-wrap gap-1.5 pl-10">
                    {LABEL_COLORS.map((c) => (
                        <button
                            key={c.key}
                            type="button"
                            role="radio"
                            aria-checked={preset.color === c.key}
                            aria-label={c.name}
                            title={c.name}
                            onClick={() => onRecolor(c.key)}
                            className={`flex size-6 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-card focus-visible:ring-2 focus-visible:ring-brand ${c.dot} ${
                                preset.color === c.key ? "ring-2 ring-foreground/40" : ""
                            }`}
                        >
                            {preset.color === c.key && <Check className="size-3 text-white" strokeWidth={3} aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}
        </li>
    );
}
