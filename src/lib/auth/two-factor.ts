import "server-only";

import crypto from "node:crypto";
import {
    generateSecret,
    generateURI,
    verify,
} from "otplib";
import QRCode from "qrcode";

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
    const value = process.env.TWO_FACTOR_ENCRYPTION_KEY;

    if (!value) {
        throw new Error("TWO_FACTOR_ENCRYPTION_KEY is not configured.");
    }

    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
        throw new Error(
            "TWO_FACTOR_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.",
        );
    }

    return Buffer.from(value, "hex");
}

/* ------------------------------------------------------------------ */
/* Secret encryption (AES-256-GCM)                                     */
/* ------------------------------------------------------------------ */

export function encryptTwoFactorSecret(secret: string) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    const ciphertext = Buffer.concat([
        cipher.update(secret, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
        iv.toString("base64"),
        authTag.toString("base64"),
        ciphertext.toString("base64"),
    ].join(":");
}

export function decryptTwoFactorSecret(encrypted: string) {
    const key = getEncryptionKey();

    const parts = encrypted.split(":");

    if (parts.length !== 3) {
        throw new Error("Invalid encrypted 2FA secret.");
    }

    const [ivBase64, authTagBase64, ciphertextBase64] = parts;

    const authTag = Buffer.from(authTagBase64, "base64");

    // Reject truncated tags: GCM would otherwise accept a shorter,
    // weaker tag if an attacker supplied one.
    if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error("Invalid encrypted 2FA secret.");
    }

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(ivBase64, "base64"),
        { authTagLength: AUTH_TAG_LENGTH },
    );

    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextBase64, "base64")),
        decipher.final(),
    ]);

    return plaintext.toString("utf8");
}

/* ------------------------------------------------------------------ */
/* TOTP                                                                */
/* ------------------------------------------------------------------ */

export function createTwoFactorSecret() {
    return generateSecret();
}

export function createTwoFactorUri(secret: string, email: string) {
    return generateURI({
        issuer: "Workvanta",
        label: email,
        secret,
    });
}

export async function createTwoFactorQrCode(secret: string, email: string) {
    const uri = createTwoFactorUri(secret, email);

    const qrCode = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 280,
    });

    return { uri, qrCode };
}

export async function verifyTwoFactorCode(secret: string, code: string) {
    const normalizedCode = code.replace(/\s+/g, "");

    if (!/^\d{6}$/.test(normalizedCode)) {
        return false;
    }

    try {
        const result = await verify({
            secret,
            token: normalizedCode,
            // Accept one 30-second step either side, so a slightly wrong
            // phone clock or a code that rolls over while typing still works.
            // (Option name is for otplib v13. Check your version's docs.)
            epochTolerance: 30,
        });

        return result.valid;
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/* Backup codes                                                        */
/* ------------------------------------------------------------------ */

/**
 * Normalize backup codes before hashing or comparing them.
 * These are all treated as the same code:
 *
 * ABCD-1234-EFGH-5678
 * abcd-1234-efgh-5678
 * ABCD1234EFGH5678
 */
export function normalizeBackupCode(code: string) {
    return code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function randomBackupCode() {
    const raw = crypto.randomBytes(8).toString("hex").toUpperCase();

    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

/**
 * Keyed hash (HMAC-SHA256) of the normalized code.
 *
 * Backup codes have 64 bits of randomness, so a slow hash like bcrypt adds
 * no real protection. HMAC with the server key is fast, deterministic (so
 * the database can look a code up directly), and useless to an attacker who
 * only has a copy of the database.
 */
export function hashBackupCode(code: string) {
    return crypto
        .createHmac("sha256", getEncryptionKey())
        .update(`backup-code:${normalizeBackupCode(code)}`)
        .digest("hex");
}

export function generateBackupCodes(count = 10) {
    const codes = new Set<string>();

    while (codes.size < count) {
        codes.add(randomBackupCode());
    }

    const plaintextCodes = [...codes];

    return {
        plaintextCodes,
        hashedCodes: plaintextCodes.map(hashBackupCode),
    };
}