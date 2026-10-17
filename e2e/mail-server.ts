import fs from "node:fs";
import path from "node:path";

import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";

/**
 * A throwaway SMTP server for end-to-end tests. It accepts every message
 * the app sends and writes it to `dir` as JSON, so tests can read emails
 * (e.g. invitation links) without a real mail provider.
 */
export function startMailServer({ port, dir }: { port: number; dir: string }) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    let count = 0;

    const server = new SMTPServer({
        authOptional: true,
        disabledCommands: ["STARTTLS"],
        logger: false,
        onAuth(_auth, _session, callback) {
            callback(null, { user: "e2e" });
        },
        onData(stream, _session, callback) {
            simpleParser(stream)
                .then((mail) => {
                    const to = Array.isArray(mail.to) ? mail.to[0] : mail.to;
                    const record = {
                        to: to?.value.map((a) => a.address?.toLowerCase()) ?? [],
                        subject: mail.subject ?? "",
                        text: mail.text ?? "",
                        html: typeof mail.html === "string" ? mail.html : "",
                        receivedAt: new Date().toISOString(),
                    };
                    count += 1;
                    fs.writeFileSync(
                        path.join(dir, `${String(count).padStart(4, "0")}.json`),
                        JSON.stringify(record, null, 2),
                    );
                    callback();
                })
                .catch((error) => callback(error));
        },
    });

    return new Promise<() => Promise<void>>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
            resolve(() => new Promise<void>((done) => server.close(() => done())));
        });
    });
}

export type CapturedEmail = {
    to: string[];
    subject: string;
    text: string;
    html: string;
    receivedAt: string;
};

/** Waits for the newest email sent to `address` and returns it. */
export async function waitForEmail(
    dir: string,
    address: string,
    { timeoutMs = 15_000, subjectIncludes }: { timeoutMs?: number; subjectIncludes?: string } = {},
): Promise<CapturedEmail> {
    const deadline = Date.now() + timeoutMs;
    const wanted = address.toLowerCase();

    while (Date.now() < deadline) {
        const files = fs.existsSync(dir) ? fs.readdirSync(dir).sort().reverse() : [];

        for (const file of files) {
            const mail = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as CapturedEmail;
            if (
                mail.to.includes(wanted) &&
                (!subjectIncludes || mail.subject.includes(subjectIncludes))
            ) {
                return mail;
            }
        }

        await new Promise((r) => setTimeout(r, 250));
    }

    throw new Error(`No email to ${address} arrived within ${timeoutMs}ms`);
}

/** Pulls the first link to `pathPrefix` (e.g. "/invite/") out of an email. */
export function extractLink(mail: CapturedEmail, pathPrefix: string) {
    const body = `${mail.text}\n${mail.html}`;
    const escaped = pathPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = body.match(new RegExp(`https?://[^\\s"'<>]+${escaped}[^\\s"'<>]+`));
    if (!match) throw new Error(`No ${pathPrefix} link in email "${mail.subject}"`);
    return match[0].replace(/&amp;/g, "&");
}
