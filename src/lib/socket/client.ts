import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

let socketPromise: Promise<Socket> | null = null;

async function fetchToken() {
    const response = await fetch("/api/socket-token", {
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Unable to authenticate socket (HTTP ${response.status})`);
    }

    const { token } = await response.json();
    return token as string;
}

async function createSocket() {
    const firstToken = await fetchToken();
    let firstAttempt = true;

    return io(SOCKET_URL, {
        // Reconnects fetch a fresh token instead of reusing one that may have expired.
        auth: (callback) => {
            if (firstAttempt) {
                firstAttempt = false;
                callback({ token: firstToken });
                return;
            }

            fetchToken()
                .then((token) => callback({ token }))
                .catch(() => callback({}));
        },
    });
}

export function getSocket() {
    if (!socketPromise) {
        socketPromise = createSocket().catch((error) => {
            socketPromise = null;
            throw error;
        });
    }

    return socketPromise;
}

export async function disconnectSocket() {
    if (!socketPromise) return;

    const socket = await socketPromise.catch(() => null);
    socket?.disconnect();
    socketPromise = null;
}