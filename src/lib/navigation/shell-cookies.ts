// Plain module (not "use client") so server code can read these values:
// a constant imported from a client-component file arrives on the server as
// a reference placeholder, not the string.

/** Last workspace visited, so pages outside a workspace keep showing it. */
export const LAST_WORKSPACE_COOKIE = "wv-last-workspace";

/** "collapsed" when the person shrank the sidebar to icons. */
export const SIDEBAR_COOKIE = "wv-sidebar";
