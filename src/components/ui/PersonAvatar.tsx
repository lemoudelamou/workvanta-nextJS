import Image from "next/image";

import { personColor } from "@/lib/ui/person-color";

export type AvatarPerson = { name: string | null; email: string; image: string | null };

export function personInitials(person: Pick<AvatarPerson, "name" | "email">) {
    const source = person.name?.trim() || person.email;
    const parts = source.split(/\s+/).filter(Boolean);
    return ((parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)) || "?").toUpperCase();
}

/** A round face: their photo, or initials on their own colour. */
export function PersonAvatar({ person, size = 36 }: { person: AvatarPerson; size?: number }) {
    return (
        <span
            aria-hidden="true"
            className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${personColor(person.email)}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        >
            {person.image ? (
                <Image src={person.image} alt="" fill sizes={`${size}px`} className="object-cover" />
            ) : (
                personInitials(person)
            )}
        </span>
    );
}
