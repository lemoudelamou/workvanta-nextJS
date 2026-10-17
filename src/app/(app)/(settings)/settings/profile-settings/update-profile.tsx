"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { updateProfile } from "@/app/(app)/(settings)/settings/profile-settings/actions";
import { buttonStyles } from "@/app/style/button-style";
import { personColor } from "@/lib/ui/person-color";

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
        <div className="relative p-5 sm:p-6">
            <div className="flex items-start gap-4">
                {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={image}
                        alt=""
                        className="size-14 shrink-0 rounded-full object-cover ring-1 ring-border"
                    />
                ) : (
                    <div className={`flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${personColor(email)}`}>
                        {initials}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-foreground">
                                {currentName || "Add your name"}
                            </p>

                            <p title={email} className="mt-0.5 truncate text-sm text-muted-foreground">
                                {email}
                            </p>
                        </div>

                        {!isEditing && (
                            <button
                                type="button"
                                onClick={startEditing}
                                className={`${buttonStyles({ variant: "secondary", size: "sm" })} w-fit shrink-0`}
                            >
                                <Pencil className="size-3.5" aria-hidden="true" />
                                Edit name
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="mt-4 max-w-md">
                            <label
                                htmlFor="settings-name"
                                className="text-sm font-medium text-foreground"
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
                                className="mt-1.5 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-wait disabled:opacity-60"
                            />

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleSave()}
                                    disabled={isSaving}
                                    className={buttonStyles({ size: "sm" })}
                                >
                                    <Check className="size-4" />

                                    {isSaving ? "Saving…" : "Save"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className={buttonStyles({ variant: "secondary", size: "sm" })}
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

