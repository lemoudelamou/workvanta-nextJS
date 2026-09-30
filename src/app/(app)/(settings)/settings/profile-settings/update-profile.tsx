"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { updateProfile } from "@/app/(app)/(settings)/settings/profile-settings/actions";

interface ProfileFormProps {
    name: string;
    email: string;
    image: string;
    initials: string;
}

export default function UpdateProfile({
    name,
    email,
    image,
    initials,
}: ProfileFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [nameInput, setNameInput] = useState(name);
    const [currentName, setCurrentName] = useState(name);
    const [isSaving, setIsSaving] = useState(false);

    const [alert, setAlert] = useState<{
        variant: "success" | "error";
        title: string;
    } | null>(null);

    async function handleSave() {
        const trimmedName = nameInput.trim();

        setAlert(null);

        if (!trimmedName) {
            setNameInput(currentName);

            setAlert({
                variant: "error",
                title: "Name cannot be empty.",
            });

            return;
        }

        if (trimmedName === currentName) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.set("name", trimmedName);

            await updateProfile(formData);

            setCurrentName(trimmedName);
            setNameInput(trimmedName);
            setIsEditing(false);

            setAlert({
                variant: "success",
                title: "Your name has been updated successfully.",
            });
        } catch (error) {
            console.error("Failed to save profile:", error);

            setNameInput(currentName);

            setAlert({
                variant: "error",
                title: "Failed to update your name. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    }

    function handleCancel() {
        if (isSaving) {
            return;
        }

        setNameInput(currentName);
        setIsEditing(false);
        setAlert(null);
    }

    function startEditing() {
        setIsEditing(true);
        setAlert(null);
    }

    return (
        <div className="relative flex flex-col gap-5 p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={image}
                        alt=""
                        className="size-16 shrink-0 rounded-full border border-slate-200 object-cover shadow-lg shadow-slate-950/10 dark:border-white/[0.08]"
                    />
                ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-700 shadow-lg shadow-slate-950/10 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200">
                        {initials}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                Profile
                            </p>

                            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                Update the name associated with your account.
                            </p>
                        </div>

                        {!isEditing && (
                            <button
                                type="button"
                                onClick={startEditing}
                                className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.07]"
                            >
                                <Pencil className="size-3.5" />
                                Edit profile
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="mt-5 max-w-xl">
                            <label
                                htmlFor="settings-name"
                                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                            >
                                Name
                            </label>

                            <input
                                id="settings-name"
                                value={nameInput}
                                onChange={(event) => {
                                    setNameInput(event.target.value);
                                    setAlert(null);
                                }}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter" &&
                                        !isSaving
                                    ) {
                                        event.preventDefault();
                                        void handleSave();
                                    }

                                    if (
                                        event.key === "Escape" &&
                                        !isSaving
                                    ) {
                                        event.preventDefault();
                                        handleCancel();
                                    }
                                }}
                                autoFocus
                                disabled={isSaving}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-950 outline-none transition-shadow placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60 disabled:cursor-wait disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus:border-white/[0.16] dark:focus:ring-white/[0.05]"
                            />

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleSave()}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                                >
                                    <Check className="size-4" />

                                    {isSaving ? "Saving" : "Save"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.07]"
                                >
                                    <X className="size-4" />

                                    Cancel
                                </button>
                            </div>

                            {alert && (
                                <div className="mt-3">
                                    <AlertMessage
                                        variant={alert.variant}
                                        title={alert.title}
                                        duration={5000}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        Name
                                    </dt>

                                    <dd className="mt-1.5 truncate text-sm font-medium text-slate-950 dark:text-white">
                                        {currentName || "Not set"}
                                    </dd>
                                </div>

                                <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        Email
                                    </dt>

                                    <dd
                                        title={email}
                                        className="mt-1.5 truncate text-sm font-medium text-slate-950 dark:text-white"
                                    >
                                        {email || "Not available"}
                                    </dd>
                                </div>
                            </dl>

                            {alert && (
                                <div className="mt-3">
                                    <AlertMessage
                                        variant={alert.variant}
                                        title={alert.title}
                                        duration={5000}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

