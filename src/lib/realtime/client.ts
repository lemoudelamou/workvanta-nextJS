import type { Realtime, TokenRequest } from "ably";

/** null: realtime is off on this server (no Ably key configured). */
async function fetchTokenRequest(): Promise<TokenRequest | null> {
    const response = await fetch("/api/realtime-token", {
        credentials: "include",
        cache: "no-store",
    });

    if (response.status === 204) return null;
    if (!response.ok) {
        throw new Error(`Unable to authenticate realtime (HTTP ${response.status})`);
    }

    return response.json();
}

async function createClient() {
    const first = await fetchTokenRequest();
    if (!first) return null;

    // Loaded only when realtime is on, to keep it out of the main bundle.
    const { Realtime } = await import("ably");
    let pending: TokenRequest | null = first;

    return new Realtime({
        // Ably asks again before the token expires; each time gets a fresh one.
        authCallback: (_params, callback) => {
            const ready = pending;
            pending = null;
            (ready ? Promise.resolve(ready) : fetchTokenRequest())
                .then((tokenRequest) => callback(null, tokenRequest))
                .catch((error: unknown) => callback(String(error), null));
        },
    });
}

let clientPromise: Promise<Realtime | null> | null = null;

/** One shared connection per tab, or null when realtime is off. */
export function getRealtime() {
    if (!clientPromise) {
        clientPromise = createClient().catch((error) => {
            clientPromise = null;
            throw error;
        });
    }

    return clientPromise;
}
