"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { updateUserPreferences } from "@/app/(app)/(settings)/settings/appearance-settings/actions";

type Theme = "light" | "dark" | "system";

interface ThemeSelectionProps {
    initialTheme?: Theme;
}

const THEME_STORAGE_KEY = "workvanta-theme";

function applyTheme(theme: Theme) {
    const root = document.documentElement;

    if (theme === "dark") {
        root.classList.add("dark");
        return;
    }

    if (theme === "light") {
        root.classList.remove("dark");
        return;
    }

    const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
    ).matches;

    root.classList.toggle("dark", prefersDark);
}

export default function ThemeSelection({
    initialTheme = "system",
}: ThemeSelectionProps) {
    const [theme, setTheme] = useState<Theme>(initialTheme);
    const [isSavingTheme, setIsSavingTheme] = useState(false);

    useEffect(() => {
        localStorage.setItem(
            THEME_STORAGE_KEY,
            initialTheme,
        );

        applyTheme(initialTheme);
    }, [initialTheme]);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        if (theme !== "system") {
            return;
        }

        const mediaQuery = window.matchMedia(
            "(prefers-color-scheme: dark)",
        );

        function handleSystemThemeChange() {
            applyTheme("system");
        }

        mediaQuery.addEventListener(
            "change",
            handleSystemThemeChange,
        );

        return () => {
            mediaQuery.removeEventListener(
                "change",
                handleSystemThemeChange,
            );
        };
    }, [theme]);

    async function handleThemeChange(newTheme: Theme) {
        if (newTheme === theme) {
            return;
        }

        const previousTheme = theme;

        setTheme(newTheme);
        setIsSavingTheme(true);

        applyTheme(newTheme);

        localStorage.setItem(
            THEME_STORAGE_KEY,
            newTheme,
        );

        try {
            await updateUserPreferences({
                theme: getThemePreference(newTheme),
            });
        } catch (error) {
            console.error(
                "Failed to save theme:",
                error,
            );

            setTheme(previousTheme);
            applyTheme(previousTheme);

            localStorage.setItem(
                THEME_STORAGE_KEY,
                previousTheme,
            );
        } finally {
            setIsSavingTheme(false);
        }
    }

    return (
        <div className="p-5 sm:p-6">
            <div
                role="radiogroup"
                aria-label="Theme"
                className="grid grid-cols-3 gap-3 sm:gap-4"
            >
                <ThemeOption
                    theme="light"
                    selectedTheme={theme}
                    title="Light"
                    isDisabled={isSavingTheme}
                    onSelect={handleThemeChange}
                />
                <ThemeOption
                    theme="dark"
                    selectedTheme={theme}
                    title="Dark"
                    isDisabled={isSavingTheme}
                    onSelect={handleThemeChange}
                />
                <ThemeOption
                    theme="system"
                    selectedTheme={theme}
                    title="Match device"
                    isDisabled={isSavingTheme}
                    onSelect={handleThemeChange}
                />
            </div>
        </div>
    );
}

function getThemePreference(theme: Theme) {
    switch (theme) {
        case "light":
            return "LIGHT";

        case "dark":
            return "DARK";

        case "system":
            return "SYSTEM";
    }
}

// Colors for the miniature previews, fixed so each card always shows its
// own theme regardless of the current one.
const PREVIEW = {
    light: { bg: "#eceef2", panel: "#f5f6f8", card: "#ffffff", line: "#d9dde4", ink: "#171a21" },
    dark: { bg: "#0a0b0e", panel: "#0f1115", card: "#181b21", line: "#2a2f39", ink: "#eceef2" },
} as const;

/** A tiny sketch of the app: sidebar, a heading, and two cards. */
function MiniApp({ mode }: { mode: "light" | "dark" }) {
    const c = PREVIEW[mode];
    return (
        <div className="flex h-full w-full" style={{ background: c.bg }}>
            <div className="flex w-[26%] flex-col gap-1.5 p-2">
                <span className="h-2 w-3/4 rounded-sm" style={{ background: c.ink, opacity: 0.85 }} />
                <span className="mt-1 h-1.5 w-full rounded-sm" style={{ background: c.line }} />
                <span className="h-1.5 w-4/5 rounded-sm" style={{ background: c.line }} />
                <span className="h-1.5 w-full rounded-sm bg-[#4b3fd9]" />
            </div>
            <div className="my-1.5 mr-1.5 flex flex-1 flex-col gap-1.5 rounded-md p-2" style={{ background: c.panel }}>
                <span className="h-2 w-1/2 rounded-sm" style={{ background: c.ink, opacity: 0.85 }} />
                <div className="mt-0.5 grid flex-1 grid-cols-2 gap-1.5">
                    {[0, 1].map((i) => (
                        <div key={i} className="flex flex-col gap-1 rounded p-1.5" style={{ background: c.card, boxShadow: `0 0 0 1px ${c.line}` }}>
                            <span className="h-1 w-4/5 rounded-sm" style={{ background: c.line }} />
                            <span className="h-1 w-3/5 rounded-sm" style={{ background: c.line }} />
                            <span className={`mt-auto h-1 w-1/3 rounded-sm ${i ? "bg-[#1e9e6a]" : "bg-[#d18a12]"}`} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface ThemeOptionProps {
    theme: Theme;
    selectedTheme: Theme;
    title: string;
    isDisabled?: boolean;
    onSelect: (theme: Theme) => void;
}

function ThemeOption({
    theme,
    selectedTheme,
    title,
    isDisabled = false,
    onSelect,
}: ThemeOptionProps) {
    const isSelected = selectedTheme === theme;

    return (
        <button
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isDisabled}
            onClick={() => onSelect(theme)}
            className={`group text-left outline-none ${isDisabled ? "cursor-wait" : "cursor-pointer"}`}
        >
            <span
                className={`relative block aspect-[16/10] overflow-hidden rounded-lg transition-shadow duration-150 group-focus-visible:ring-2 group-focus-visible:ring-brand group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-card ${
                    isSelected
                        ? "shadow-[0_0_0_2px_var(--brand)]"
                        : "shadow-[0_0_0_1px_var(--border)] group-hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_30%,transparent)]"
                }`}
            >
                {theme === "system" ? (
                    <span className="absolute inset-0 flex">
                        <span className="relative w-1/2 overflow-hidden">
                            <span className="absolute inset-y-0 left-0 w-[200%]"><MiniApp mode="light" /></span>
                        </span>
                        <span className="relative w-1/2 overflow-hidden">
                            <span className="absolute inset-y-0 right-0 w-[200%]"><MiniApp mode="dark" /></span>
                        </span>
                    </span>
                ) : (
                    <MiniApp mode={theme} />
                )}
                {isSelected && (
                    <span className="absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-white shadow dark:text-[#0f1115]">
                        <Check className="size-3" aria-hidden="true" />
                    </span>
                )}
            </span>
            <span className={`mt-2 block text-sm ${isSelected ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {title}
            </span>
        </button>
    );
}
