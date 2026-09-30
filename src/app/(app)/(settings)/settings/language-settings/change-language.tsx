"use client";

import { useState } from "react";

import { updateLanguage as saveLanguage } from "@/app/(app)/(settings)/settings/language-settings/actions";

interface PreferencesSettingsProps {
    initialLanguage?: string;
}

export default function PreferencesSettings({
    initialLanguage = "en",
}: PreferencesSettingsProps) {
    const [selectedLanguage, setSelectedLanguage] =
        useState(initialLanguage);

    const [isSaving, setIsSaving] = useState(false);

    async function handleLanguageChange(language: string) {
        const oldLanguage = selectedLanguage;

        setSelectedLanguage(language);
        setIsSaving(true);

        try {
            await saveLanguage(language);

            localStorage.setItem(
                "workvanta-language",
                language,
            );

            window.location.reload();
        } catch (error) {
            console.error("Failed to save language:", error);

            setSelectedLanguage(oldLanguage);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-6 p-5 sm:p-7">
            <div>
                <label
                    htmlFor="language"
                    className="mb-2 block text-sm font-semibold text-slate-950 dark:text-white"
                >
                    Language
                </label>

                <p className="mb-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Choose the language used across the app.
                </p>

                <select
                    id="language"
                    value={selectedLanguage}
                    disabled={isSaving}
                    onChange={(event) =>
                        handleLanguageChange(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-wait disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus:border-white/[0.2] sm:max-w-md"
                >
                    <option value="en">English</option>
                </select>
            </div>
        </div>
    );
}

