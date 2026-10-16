import crypto from "node:crypto";

const TOKEN_TTL_SECONDS = 60;

type SocketTokenPayload = {
    sessionId: string;
    exp: number;
};

function getSecret() {
    const secret =
        process.env.SOCKET_AUTH_SECRET;

    if (!secret) {
        throw new Error(
            "SOCKET_AUTH_SECRET is not defined",
        );
    }

    return secret;
}

function sign(value: string) {
    return crypto
        .createHmac(
            "sha256",
            getSecret(),
        )
        .update(value)
        .digest("base64url");
}

export function createSocketToken(
    sessionId: string,
) {
    const payload: SocketTokenPayload = {
        sessionId,
        exp:
            Math.floor(
                Date.now() / 1000,
            ) + TOKEN_TTL_SECONDS,
    };

    const encoded = Buffer.from(
        JSON.stringify(payload),
    ).toString("base64url");

    const signature = sign(encoded);

    return `${encoded}.${signature}`;
}

export function verifySocketToken(
    token: string,
) {
    const parts = token.split(".");

    if (parts.length !== 2) {
        return null;
    }

    const [encoded, signature] =
        parts;

    const expected = sign(encoded);

    const providedBuffer =
        Buffer.from(signature);

    const expectedBuffer =
        Buffer.from(expected);

    if (
        providedBuffer.length !==
        expectedBuffer.length ||
        !crypto.timingSafeEqual(
            providedBuffer,
            expectedBuffer,
        )
    ) {
        return null;
    }

    try {
        const payload =
            JSON.parse(
                Buffer.from(
                    encoded,
                    "base64url",
                ).toString("utf8"),
            ) as SocketTokenPayload;

        if (
            !payload.sessionId ||
            !payload.exp
        ) {
            return null;
        }

        if (
            payload.exp <=
            Math.floor(
                Date.now() / 1000,
            )
        ) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}