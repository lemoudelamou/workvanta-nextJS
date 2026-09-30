"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ACCENTS, type CardAccent } from "@/lib/accent";

export const cardStyles =
    "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900";

export type { CardAccent };
export type CardAccentValue = CardAccent | readonly [string, string];

export type CardOwnProps = {
    interactive?: boolean;
    tilt?: boolean;
    accent?: CardAccentValue;
    reveal?: boolean;
    delay?: number;
};

type CardProps<T extends React.ElementType> = CardOwnProps & {
    as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, keyof CardOwnProps | "as">;

export function Card<T extends React.ElementType = "section">(
    allProps: CardProps<T>,
) {
    const {
        as: Tag = "section",
        className,
        interactive = false,
        tilt = false,
        accent = "indigo",
        reveal = false,
        delay = 0,
        style,
        children,
        onPointerMove,
        onPointerLeave,
        ...rest
    } = allProps as CardOwnProps & {
        as?: React.ElementType;
    } & React.HTMLAttributes<HTMLElement>;

    const ref = useRef<HTMLElement>(null);
    const frame = useRef(0);
    const pointer = useRef({ x: 0, y: 0 });

    const [c1, c2] = typeof accent === "string" ? ACCENTS[accent] : accent;

    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    // Batch pointer updates into one write per animation frame.
    function paint() {
        frame.current = 0;
        const el = ref.current;
        if (!el) return;

        const r = el.getBoundingClientRect();
        const x = pointer.current.x - r.left;
        const y = pointer.current.y - r.top;

        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);

        if (tilt) {
            el.style.setProperty("--rx", `${(0.5 - y / r.height) * 7}deg`);
            el.style.setProperty("--ry", `${(x / r.width - 0.5) * 7}deg`);
        }
    }

    function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
        // Touch has no hover, so skip the cursor effects there.
        if (e.pointerType === "mouse" || e.pointerType === "pen") {
            pointer.current = { x: e.clientX, y: e.clientY };
            if (!frame.current) frame.current = requestAnimationFrame(paint);
        }
        onPointerMove?.(e);
    }

    function handlePointerLeave(e: React.PointerEvent<HTMLElement>) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
        ref.current?.style.setProperty("--rx", "0deg");
        ref.current?.style.setProperty("--ry", "0deg");
        onPointerLeave?.(e);
    }

    return (
        <Tag
            ref={ref}
            onPointerMove={interactive ? handlePointerMove : onPointerMove}
            onPointerLeave={interactive ? handlePointerLeave : onPointerLeave}
            style={{
                ...(interactive
                    ? ({ "--accent": c1, "--accent-2": c2 } as React.CSSProperties)
                    : null),
                ...(reveal ? { animationDelay: `${delay}ms` } : null),
                ...style,
            }}
            className={cn(
                cardStyles,

                interactive && [
                    "group relative isolate overflow-hidden",
                    "transition-[transform,box-shadow] duration-150 ease-out",
                    // Hover and keyboard focus get the same treatment.
                    "hover:border-transparent focus-visible:border-transparent",
                    "hover:shadow-[0_24px_48px_-20px_rgb(var(--accent)/0.55)]",
                    "focus-visible:shadow-[0_24px_48px_-20px_rgb(var(--accent)/0.55)]",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[rgb(var(--accent)/0.6)] focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
                    "active:shadow-sm",
                    tilt
                        ? "motion-safe:[transform:perspective(900px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_translateY(var(--ty,0px))] motion-safe:hover:[--ty:-4px]"
                        : "motion-safe:hover:-translate-y-1 motion-safe:active:translate-y-0",
                ],

                reveal &&
                "motion-safe:animate-[card-in_450ms_cubic-bezier(0.22,1,0.36,1)_backwards]",

                className,
            )}
            {...rest}
        >
            {interactive ? (
                <>
                    {/* Decorative layers sit behind the content (z-0). */}

                    {/* 1. Animated gradient; only its 1px edge shows */}
                    <span
                        aria-hidden="true"
                        className="
                            pointer-events-none absolute inset-0 z-0 rounded-[inherit]
                            opacity-0 transition-opacity duration-300
                            group-hover:opacity-100 group-focus-visible:opacity-100
                            bg-[linear-gradient(110deg,rgb(var(--accent)),rgb(var(--accent-2)),rgb(var(--accent)))]
                            bg-[length:200%_100%]
                            motion-safe:animate-[card-shine_3s_linear_infinite]
                        "
                    />
                    {/* 2. Face: copies the card's own background, so custom bg/radius still work */}
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-px z-0 rounded-[inherit] bg-inherit"
                    />
                    {/* 3. Cursor-following color wash */}
                    <span
                        aria-hidden="true"
                        className="
                            pointer-events-none absolute inset-px z-0 rounded-[inherit]
                            opacity-0 transition-opacity duration-300
                            group-hover:opacity-100 group-focus-visible:opacity-100
                            bg-[radial-gradient(380px_circle_at_var(--mx,50%)_var(--my,50%),rgb(var(--accent)/0.14),transparent_70%)]
                        "
                    />
                    {/* Content always paints on top */}
                    <div className="relative z-10 h-full">{children}</div>
                </>
            ) : (
                children
            )}
        </Tag>
    );
}