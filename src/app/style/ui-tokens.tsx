/**
 * Shared design tokens (login, dashboard, ...).
 *
 *
 * Tailwind v3 only: make sure your `content` globs include this file,
 * e.g. "./src/lib/**\/*.{ts,tsx}". Tailwind v4 detects it automatically.
 */

export const hairline = "border border-slate-200/80 dark:border-white/[0.08]";

export const glass = "bg-white/75 backdrop-blur-xl dark:bg-white/[0.035]";

/**
 * Light mode has no 1px white layer (it was invisible on a near-white card);
 * the edge there is carried by the hairline border.
 */
export const starlightEdge =
    "shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.35)]";

/**
 * Offset ring so the focus indicator stays visible on both the white primary
 * button and the glass card, in light and dark mode.
 */
export const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-white/70 dark:focus-visible:ring-offset-slate-950";

export const authButton =
    "group inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl px-5 text-sm font-semibold transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 " +
    focusRing;

export const ghostButton =
    "border border-slate-200 bg-white/70 text-slate-700 hover:bg-white hover:shadow-lg dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]";

export const primaryButton =
    "bg-slate-950 text-white shadow-lg shadow-slate-950/10 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200";