import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";

import { E2E_MAIL_DIR } from "./env";
import { extractLink, waitForEmail } from "./mail-server";

/**
 * The core journey, end to end against a real database:
 *
 *   owner signs up → creates a workspace and a project → adds a task →
 *   drags it to "In progress" (and it stays there after a reload) →
 *   invites a teammate → teammate follows the email link, signs up,
 *   signs in, lands back on the invite, accepts → sees the project and task.
 */

const PASSWORD = "Workvanta123";
const run = Date.now().toString(36);

const owner = { name: "Olivia Owner", email: `owner-${run}@workvanta.test` };
const teammate = { name: "Tom Teammate", email: `tom-${run}@workvanta.test` };
const workspaceName = `Acme ${run}`;
const projectName = "Website relaunch";
const taskTitle = "Write the launch announcement";

test.describe.configure({ mode: "serial" });

async function signUp(page: Page, user: { name: string; email: string }) {
    // The sign-up page first offers Google/GitHub; open the email form.
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("textbox", { name: "Full name" }).fill(user.name);

    const email = page.getByRole("textbox", { name: "Email address" });
    if ((await email.inputValue()) === "") await email.fill(user.email);
    await expect(email).toHaveValue(user.email);

    await page.getByRole("textbox", { name: "Create a password" }).fill(PASSWORD);
    await page.getByRole("textbox", { name: "Confirm your password" }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/signin/);
}

async function signIn(page: Page, email: string) {
    const emailBox = page.getByRole("textbox", { name: "Work email" });
    await expect(emailBox).toBeVisible();
    if ((await emailBox.inputValue()) === "") await emailBox.fill(email);
    await expect(emailBox).toHaveValue(email);

    await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function dragTo(page: Page, handle: Locator, target: Locator) {
    await handle.scrollIntoViewIfNeeded();
    await handle.hover();

    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error("Drag source or target is not visible");

    const startX = from.x + from.width / 2;
    const startY = from.y + from.height / 2;

    await page.mouse.down();
    // Small first move so dnd-kit's pointer sensor (4px threshold) activates.
    await page.mouse.move(startX + 8, startY + 2, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + Math.min(80, to.height / 2), { steps: 25 });
    await page.mouse.up();
}

let browser: Browser;
let ownerPage: Page;
let workspaceUrl = "";
let projectUrl = "";

test.beforeAll(async ({ browser: b }) => {
    browser = b;
    ownerPage = await (await browser.newContext()).newPage();
});

test.afterAll(async () => {
    await ownerPage?.context().close();
});

test("owner signs up and signs in", async () => {
    const page = ownerPage;

    await page.goto("/signup");
    await signUp(page, owner);
    await signIn(page, owner.email);

    await page.waitForURL("**/dashboard");
});

test("owner creates a workspace and a project", async () => {
    const page = ownerPage;

    await page.goto("/workspace/new");
    await page.getByLabel("Workspace name").fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();

    await page.waitForURL(/\/workspace\/[^/]+$/);
    await expect(page.getByRole("heading", { name: workspaceName })).toBeVisible();
    workspaceUrl = page.url();

    await page.getByRole("link", { name: "Create project" }).first().click();
    await page.getByLabel("Project name").fill(projectName);
    await page.getByRole("button", { name: "Create project" }).click();

    await page.waitForURL(/\/project\/[^/]+$/);
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
    projectUrl = page.url();
});

test("owner adds a task and drags it to In progress", async () => {
    const page = ownerPage;

    await page.getByRole("button", { name: "Add task to To do" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill(taskTitle);
    await dialog.getByRole("button", { name: "Create task" }).click();
    await expect(dialog).toBeHidden();

    const todo = page.getByRole("region", { name: "To do" });
    await expect(todo.getByText(taskTitle)).toBeVisible();

    await dragTo(
        page,
        page.getByRole("button", { name: `Drag ${taskTitle}` }),
        page.getByRole("region", { name: "In progress" }),
    );

    const inProgress = page.getByRole("region", { name: "In progress" });
    await expect(inProgress.getByText(taskTitle)).toBeVisible();

    // The move must be saved, not just shown.
    await expect(async () => {
        await page.reload();
        await expect(
            page.getByRole("region", { name: "In progress" }).getByText(taskTitle),
        ).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
});

test("owner invites a teammate by email", async () => {
    const page = ownerPage;

    await page.goto(`${workspaceUrl}/team`);
    await page.getByPlaceholder("teammate@example.com").fill(teammate.email);
    await page.getByRole("button", { name: "Send invitation" }).click();

    await expect(page.getByText(`Invitation sent successfully to ${teammate.email}.`)).toBeVisible();
    await expect(page.getByText("Pending invitations")).toBeVisible();
});

test("teammate accepts the invitation and sees the work", async () => {
    const mail = await waitForEmail(E2E_MAIL_DIR, teammate.email, { subjectIncludes: "invited" });
    const inviteLink = extractLink(mail, "/invite/");

    const context = await browser.newContext();
    const page = await context.newPage();

    // New user: the invite sends them to sign up, with their email filled in.
    await page.goto(inviteLink);
    await page.waitForURL(/\/signup\?/);
    await signUp(page, teammate);

    // Sign-in keeps the invite as the destination.
    expect(new URL(page.url()).searchParams.get("callbackUrl")).toMatch(/^\/invite\//);
    await signIn(page, teammate.email);

    await page.waitForURL(/\/invite\//);
    await page.getByRole("button", { name: "Accept invitation" }).click();

    await page.waitForURL(/\/workspace\/[^/]+$/);
    await expect(page.getByRole("heading", { name: workspaceName })).toBeVisible();

    await page.getByRole("link", { name: `Open project ${projectName}` }).click();
    await page.waitForURL(projectUrl.replace(/^https?:\/\/[^/]+/, "**"));
    await expect(
        page.getByRole("region", { name: "In progress" }).getByText(taskTitle),
    ).toBeVisible();

    await context.close();
});
