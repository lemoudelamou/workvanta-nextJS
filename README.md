# Workvanta

Workvanta is a team workspace and project management app. Teams create workspaces, invite people with a role, organize work into projects, and track tasks on a live Kanban board or list, with comments, mentions, attachments and real-time notifications.

> 🚧 Under active development.

## Features

- **Workspaces and teams.** Invite people by email as Admin, Member or Guest. You can see pending invitations and cancel them, transfer ownership, and leave a workspace.
- **Projects.** Each project is either shared with the whole workspace or private to the people on it. Members are added with a project role of Admin, Editor or Viewer.
- **Kanban board.** Drag-and-drop tasks across To do, In progress, In review and Done. Tasks have a priority, assignee, due date and subtasks.
- **Collaboration.** Comments with `@mentions`, file attachments up to 10 MB, and an activity history on every task. Attachments are stored privately and only open for people who can see the project.
- **Live board.** When a teammate creates, moves, edits or deletes a task, open boards, lists and task pages update within a second, without a reload. Updates go only to people who can open that project.
- **Notifications.** In-app and email notifications for assignments, comments and mentions, delivered in real time. Due-date reminders and a morning digest email.
- **Accounts and security.** Sign in with email and password or with Google or GitHub. Also included: email verification, password reset, two-factor authentication (TOTP with backup codes), a session list with remote sign-out, and rate limiting.
- **Settings.** Profile, linked accounts, theme, language, and account deletion.

## Tech stack

| Area | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui, Base UI, lucide-react |
| Database | PostgreSQL 17 with [Prisma 7](https://www.prisma.io) (`@prisma/adapter-pg`) |
| Real time | [Ably](https://ably.com) (one private channel per user) |
| Scheduled jobs | Cron routes, called by [Upstash QStash](https://upstash.com/docs/qstash) or Vercel Cron |
| Rate limiting | Upstash Redis |
| File storage | Cloudinary (private delivery, signed expiring links) |
| Email | Nodemailer over SMTP |
| Testing | Jest and Testing Library |

## Architecture

Everything runs inside the Next.js app; there are no separate servers to host.

```
┌──────────────┐  publish   ┌──────┐  user:<id> channel  ┌─────────┐
│  Next.js app │ ─────────▶ │ Ably │ ──────────────────▶ │ Browser │
└──────┬───────┘            └──────┘                     └─────────┘
       ▲
       │ every 15 min / every morning (Bearer CRON_SECRET)
┌──────┴───────┐
│ QStash cron  │
└──────────────┘
```

- **Notifications.** A server action that assigns a task, comments or mentions someone saves its change, responds, and then (with Next's `after()`) creates the in-app notification and sends the email. A slow mail server never holds up the action, and a failure is logged without undoing the change.
- **Live updates.** The app publishes events (task changes, new comments, new notifications) to each recipient's private Ably channel, `user:<id>`, only for people who can open that project. A browser gets a short-lived token from `/api/realtime-token` that lets it subscribe to its own channel and nothing else. Without `ABLY_API_KEY`, live updates are off and pages update on the next load.
- **Scheduled jobs.** `/api/cron/due-dates` sends due-soon and overdue reminders; `/api/cron/digest` sends the morning digest email. Both only run for requests carrying `Authorization: Bearer <CRON_SECRET>`. See [Scheduled jobs](#scheduled-jobs).

## Getting started

### Prerequisites

- Node.js 20 or later
- Docker, for the local PostgreSQL database
- Accounts for Upstash Redis, Cloudinary and an SMTP provider. OAuth apps for Google and GitHub are optional.
- An [Ably](https://ably.com) account for live updates (optional, free plan, no card).

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root. It is used by Docker Compose, Prisma and Next.js.

```bash
# Database (also read by docker-compose.yml)
POSTGRES_USER=workvanta
POSTGRES_PASSWORD=change-me
POSTGRES_DB=workvanta
POSTGRES_PORT=5432
DATABASE_URL=postgresql://workvanta:change-me@localhost:5432/workvanta

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth sign-in (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="Workvanta <no-reply@example.com>"

# Security: generate each secret with `openssl rand -hex 32`
TWO_FACTOR_ENCRYPTION_KEY=
EMAIL_RATE_LIMIT_SECRET=
CRON_SECRET=

# Ably: live updates (optional; without it pages update on the next load)
ABLY_API_KEY=

# Due date digest email: the time zone "today" means (optional)
DIGEST_TIMEZONE=UTC

# Upstash Redis: rate limiting, and sending the digest once a day
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudinary: task attachments
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

For OAuth, register these callback URLs with Google and GitHub:

- `http://localhost:3000/api/oauth/google/callback`
- `http://localhost:3000/api/oauth/github/callback`

### 3. Start PostgreSQL

```bash
docker compose up -d   # PostgreSQL
```

### 4. Set up the database

For a new, empty database:

```bash
npx prisma migrate deploy   # create every table
npx prisma generate         # generate the Prisma client into src/generated/prisma
```

#### Existing databases

Before migration `20261016120000_add_workspace_project_models`, the workspace, project and task tables were created with `prisma db push`, so a database you've been developing against probably already has them. Running the migration there would fail with "already exists". Instead, mark it as applied once, then confirm nothing is out of sync:

```bash
npx prisma migrate resolve --applied 20261016120000_add_workspace_project_models
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
```

The second command should report no differences. If it lists any, your database has drifted from the schema; share the output before changing anything. From now on, change the schema with `npx prisma migrate dev --name <change>` and commit the migration it creates.

### 5. Run the app

```bash
npm run dev      # → http://localhost:3000
```

To try the scheduled jobs locally, call them with your `CRON_SECRET`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/due-dates
```

## Scheduled jobs

Two routes need calling on a schedule. [Upstash QStash](https://console.upstash.com/qstash) does this for free on the Upstash account the app already uses (the free plan includes up to 1,000 messages a day; these use about 100):

1. In the Upstash console, open **QStash → Schedules → Create schedule**.
2. Due-date reminders: destination `https://<your-app>/api/cron/due-dates`, cron `*/15 * * * *`.
3. Morning digest: destination `https://<your-app>/api/cron/digest`, cron `0 8 * * *` (set the schedule's time zone to match `DIGEST_TIMEZONE`).
4. For both, add the header `Authorization: Bearer <your CRON_SECRET>` (QStash passes it through to the route).

On Vercel, Vercel Cron can call the same routes and sends the `CRON_SECRET` header for you; its free Hobby plan allows only daily jobs, so use QStash for the 15-minute reminders.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with a coverage report |
| `npm run test:e2e` | Run the Playwright end-to-end journey (see below) |

## Roles and permissions

All authorization rules live in one place, [`src/lib/auth/permissions.ts`](src/lib/auth/permissions.ts). Pages use it to decide what to show, and server actions use it to decide what to allow, so the two stay in sync.

### Workspace roles

| Role | Can do |
|---|---|
| **Owner** | Everything, including deleting the workspace and transferring ownership. There is exactly one owner per workspace. |
| **Admin** | Invite people, remove Members and Guests, manage invitations, and act as project Admin on every project |
| **Member** | Create projects, and edit every workspace-visible project unless given a different project role |
| **Guest** | Only open projects they were explicitly added to |

### Project roles

| Role | Can do |
|---|---|
| **Admin** | Manage project members and visibility, delete the project, and remove any comment |
| **Editor** | Create, edit, move and delete tasks, subtasks and attachments |
| **Viewer** | Read the project and comment |

A user's effective role on a project is worked out in this order:

1. Workspace Owners and Admins are always project **Admin**.
2. Otherwise, an explicit project role applies, if they have one.
3. Otherwise, a Member gets **Editor** on workspace-visible projects.
4. Anyone else has no access.

Private projects, together with their tasks, comments and notifications, are never shown to people who can't open them.

## Project structure

```
prisma/
  schema.prisma            Data model
  migrations/              SQL migrations
src/
  app/
    (auth)/                Sign in, sign up, password reset, email verification
    (app)/
      (dashboard)/         Dashboard
      (workspace)/         Workspaces, team, projects, Kanban board, tasks
      (settings)/          Profile, security, sessions, appearance, language
      notifications/       Notification center
    api/                   OAuth, realtime token and cron routes
    invite/[token]/        Invitation acceptance
  components/ui/           Shared UI components
  lib/
    auth/                  Sessions, OAuth, 2FA, roles and permissions
    db/                    Prisma clients
    email/                 Email templates and sending
    notifications/         Notification creation, delivery, due-date jobs
    publisher/             Realtime event publishing
    realtime/              Ably client, channels, live refresh
    validations/           Zod schemas
  proxy.ts                 Redirects signed-out visitors to sign-in
```

## Testing

```bash
npm test
```

### End-to-end tests

`e2e/team-journey.spec.ts` runs the core journey in a real browser against a real database: sign up, create a workspace and project, add a task, drag it to In progress, invite a teammate by email, and have them sign up, accept and see the work. Emails are caught by a small SMTP server inside the test run, so no mail provider is needed.

You need PostgreSQL running locally, with migrations applied:

```bash
npx playwright install chromium          # once
E2E_DATABASE_URL=postgresql://user:pass@localhost:5432/workvanta_e2e \
npm run test:e2e                         # builds and starts the app on port 3100
```

The live-update check needs Ably: set `E2E_ABLY_API_KEY` (in CI, as a repository secret of that name); without it that one test is skipped.

Use a separate database: the test creates real users and workspaces. Set `E2E_DEV=1` to run against `next dev` instead of a production build (faster while iterating).

### Continuous integration

GitHub Actions runs on every push to `main` and every pull request (`.github/workflows/ci.yml`). It type-checks, runs the unit tests, runs the end-to-end journey, applies every migration to a fresh PostgreSQL, and fails if `schema.prisma` has changes that no migration covers. Lint runs there too and fails the build on any error.

Tests sit next to the code they cover, as `*.test.ts(x)` files. Pages and server actions are tested with mocked Prisma and auth. The permission rules have their own unit tests in `src/lib/auth/permissions.test.ts`.

## License

Licensed under the [Apache License 2.0](LICENSE).
