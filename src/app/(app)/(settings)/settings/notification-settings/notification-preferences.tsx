"use client";

import { useState, useTransition } from "react";

import { updateNotificationPreference } from "./actions";
import {
    NOTIFICATION_OPTIONS,
    preferenceField,
    type NotificationChannel,
    type NotificationPreferenceValues,
} from "./options";

const CHANNELS: { key: NotificationChannel; label: string }[] = [
    { key: "inApp", label: "In app" },
    { key: "email", label: "Email" },
];

function Switch({
    checked,
    onChange,
    label,
    disabled,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-60 ${
                checked ? "bg-brand" : "bg-foreground/15"
            }`}
        >
            <span
                aria-hidden="true"
                className={`inline-block size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,21,0.3)] transition-transform duration-200 ${
                    checked ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
            />
        </button>
    );
}

export default function NotificationPreferences({
    initial,
}: {
    initial: NotificationPreferenceValues;
}) {
    const [values, setValues] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    function toggle(field: keyof NotificationPreferenceValues, next: boolean) {
        const previous = values[field];
        setError(null);
        setValues((current) => ({ ...current, [field]: next }));

        startTransition(async () => {
            const result = await updateNotificationPreference(field, next).catch(() => ({
                error: "Couldn't save that change. Please try again.",
            }));
            if (result.error) {
                setValues((current) => ({ ...current, [field]: previous }));
                setError(result.error);
            }
        });
    }

    return (
        <div>
            <div className="hidden grid-cols-[minmax(0,1fr)_72px_72px] items-center gap-4 border-b border-border px-5 py-2.5 text-xs font-medium text-muted-foreground sm:grid sm:px-6">
                <span>Notify me when</span>
                {CHANNELS.map((channel) => (
                    <span key={channel.key} className="text-center">
                        {channel.label}
                    </span>
                ))}
            </div>

            <ul className="divide-y divide-border">
                {NOTIFICATION_OPTIONS.map((option) => (
                    <li
                        key={option.key}
                        className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_72px_72px] sm:items-center sm:gap-4 sm:px-6"
                    >
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{option.label}</p>
                            <p className="mt-0.5 text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        {CHANNELS.map((channel) => {
                            const field = preferenceField(channel.key, option.key);
                            return (
                                <label
                                    key={channel.key}
                                    className="flex items-center justify-between gap-3 text-sm text-muted-foreground sm:justify-center"
                                >
                                    <span className="sm:sr-only">{channel.label}</span>
                                    <Switch
                                        checked={values[field]}
                                        onChange={(next) => toggle(field, next)}
                                        label={`${option.label}: ${channel.label.toLowerCase()} notifications`}
                                    />
                                </label>
                            );
                        })}
                    </li>
                ))}
            </ul>

            {error && (
                <p role="alert" className="border-t border-border px-5 py-3 text-sm font-medium text-danger sm:px-6">
                    {error}
                </p>
            )}
        </div>
    );
}
