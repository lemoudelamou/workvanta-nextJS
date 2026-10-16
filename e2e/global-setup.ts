import { E2E_MAIL_DIR, E2E_SMTP_PORT } from "./env";
import { startMailServer } from "./mail-server";

/** Starts the in-test SMTP sink for the whole run; stopped at teardown. */
export default async function globalSetup() {
    const stop = await startMailServer({ port: E2E_SMTP_PORT, dir: E2E_MAIL_DIR });
    return async () => {
        await stop();
    };
}
