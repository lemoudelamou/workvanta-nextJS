import Ably from "ably";

let rest: Ably.Rest | null | undefined;

/**
 * The server's Ably client, or null when ABLY_API_KEY isn't set: realtime is
 * then off (pages still work, they just don't update live).
 */
export function ablyRest() {
    if (rest === undefined) {
        const key = process.env.ABLY_API_KEY;
        rest = key ? new Ably.Rest({ key }) : null;
    }
    return rest;
}
