"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

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
        <div className="p-5 sm:p-7">
            <section>
                <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Theme
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Choose your preferred color scheme.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <ThemeOption
                        theme="light"
                        selectedTheme={theme}
                        icon={<Sun className="size-4" />}
                        title="Light"
                        description="Bright and clean"
                        isDisabled={isSavingTheme}
                        onSelect={handleThemeChange}
                    />

                    <ThemeOption
                        theme="dark"
                        selectedTheme={theme}
                        icon={<Moon className="size-4" />}
                        title="Dark"
                        description="Easy on the eyes"
                        isDisabled={isSavingTheme}
                        onSelect={handleThemeChange}
                    />

                    <ThemeOption
                        theme="system"
                        selectedTheme={theme}
                        icon={<Monitor className="size-4" />}
                        title="System"
                        description="Follow your device"
                        isDisabled={isSavingTheme}
                        onSelect={handleThemeChange}
                    />
                </div>
            </section>
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

interface ThemeOptionProps {
    theme: Theme;
    selectedTheme: Theme;
    icon: ReactNode;
    title: string;
    description: string;
    isDisabled?: boolean;
    onSelect: (theme: Theme) => void;
}

function ThemeOption({
    theme,
    selectedTheme,
    icon,
    title,
    description,
    isDisabled = false,
    onSelect,
}: ThemeOptionProps) {
    const isSelected = selectedTheme === theme;

    return (
        <button
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(theme)}
            className={`relative rounded-xl border p-4 text-left transition ${
                isSelected
                    ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-white/[0.08]"
                    : "border-slate-200/80 bg-white/60 hover:border-slate-300 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.05]"
            } ${
                isDisabled
                    ? "cursor-wait opacity-70"
                    : "cursor-pointer"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
                    {icon}
                </div>

                {isSelected && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                        <Check className="size-3" />
                    </span>
                )}
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                {title}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {description}
            </p>
        </button>
    );
}

