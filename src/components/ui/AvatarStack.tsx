import { personColor } from "@/lib/ui/person-color";

export type StackPerson = { id: string; name: string | null; email: string; image: string | null };

function initials(person: StackPerson) {
    const source = person.name?.trim() || person.email;
    const parts = source.split(/\s+/).filter(Boolean);
    return ((parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)) || "?").toUpperCase();
}

const SIZES = { sm: "size-6 text-[9px]", md: "size-7 text-[10px]" } as const;

/** Overlapping faces, with "+N" when there are more than `max`. */
export function AvatarStack({
    people,
    max = 4,
    size = "sm",
    total,
    label,
}: {
    people: StackPerson[];
    max?: number;
    size?: keyof typeof SIZES;
    /** Everyone, when `people` is only the first few. */
    total?: number;
    label?: string;
}) {
    const shown = people.slice(0, max);
    const extra = (total ?? people.length) - shown.length;
    if (shown.length === 0) return null;

    return (
        <span
            role="img"
            aria-label={label ?? people.map((p) => p.name ?? p.email).join(", ")}
            className="flex items-center -space-x-1.5"
        >
            {shown.map((person) => (
                <span
                    key={person.id}
                    title={person.name ?? person.email}
                    className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-card ${SIZES[size]} ${personColor(person.email)}`}
                >
                    {person.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={person.image} alt="" className="size-full object-cover" />
                    ) : (
                        initials(person)
                    )}
                </span>
            ))}
            {extra > 0 && (
                <span
                    className={`flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-card ${SIZES[size]}`}
                >
                    +{extra}
                </span>
            )}
        </span>
    );
}
