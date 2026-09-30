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


export const iconTile =
    "flex shrink-0 items-center justify-center border border-slate-200 bg-white/80 text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300";

export const sectionClass = `${glass} ${hairline} ${starlightEdge} relative overflow-hidden rounded-2xl sm:rounded-[28px]`;


export const cardClass =
    "rounded-xl border border-slate-200/80 bg-white/60 p-4 transition-all duration-300 hover:border-slate-300 hover:bg-white/90 hover:shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.05]";

export const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

export const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus:border-white/[0.2] dark:focus:ring-white/[0.08]";

export const primaryButtonClass =
    "shrink-0 rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200";

export const secondaryButtonClass =
    "shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]";

export const connectedBadgeClass =
    "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/[0.08] dark:text-emerald-300";
