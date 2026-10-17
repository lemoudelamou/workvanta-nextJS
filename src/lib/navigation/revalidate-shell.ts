import { revalidatePath } from "next/cache";

/**
 * The sidebar (in the app layout) lists workspaces and projects. Call this
 * after anything that adds, renames, removes or changes access to them, so
 * every page picks up the new list.
 */
export function revalidateAppShell() {
    revalidatePath("/", "layout");
}
