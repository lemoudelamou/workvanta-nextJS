# Workvanta

Workvanta is a team workspace and project management app. Teams create workspaces, invite people with a role, organize work into projects, and track tasks on a Kanban board, with comments, mentions, attachments and real-time notifications.

> 🚧 Under active development.

## Features

- **Workspaces and teams.** Invite people by email as Admin, Member or Guest. You can see pending invitations and cancel them, transfer ownership, and leave a workspace.
- **Projects.** Each project is either shared with the whole workspace or private to the people on it. Members are added with a project role of Admin, Editor or Viewer.
- **Kanban board.** Drag-and-drop tasks across To do, In progress, In review and Done. Tasks have a priority, assignee, due date and subtasks.
- **Collaboration.** Comments with `@mentions`, file attachments up to 10 MB, and an activity history on every task. Attachments are stored privately and only open for people who can see the project.
- **Notifications.** In-app and email notifications for assignments, comments and mentions, delivered in real time over WebSockets.
- **Accounts and security.** Sign in with email and password or with Google or GitHub. Also included: email verification, password reset, two-factor authentication (TOTP with backup codes), a session list with remote sign-out, and rate limiting.
- **Settings.** Profile, linked accounts, theme, language, and account deletion.

## Tech stack

| Area | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui, Base UI, lucide-react |
| Database | PostgreSQL 17 with [Prisma 7](https://www.prisma.io) (`@prisma/adapter-pg`) |
| Background jobs | BullMQ on Redis |
| Real time | Socket.IO with a Redis pub/sub adapter |
| Rate limiting | Upstash Redis |
| File storage | Cloudinary (private delivery, signed expiring links) |
| Email | Nodemailer over SMTP |
| Testing | Jest and Testing Library |

## Architecture

The app runs as three processes that share PostgreSQL and Redis:

```
┌──────────────┐   queue jobs    ┌──────────────┐
│  Next.js app │ ──────────────▶ │    Worker    │  sends notifications + emails
│  (npm run    │                 │ (npm run     │
│     dev)     │ ◀─┐             │   worker)    │
└──────┬───────┘   │             └──────┬───────┘
       │ publish   │ socket token        │ publish
       ▼           │                     ▼
┌─────────────────────────────────────────────────┐
│                      Redis                      │
└─────────────────────────────────────────────────┘
       ▲
       │ subscribe
┌──────┴───────┐   WebSocket   ┌──────────┐
│ Socket server│ ◀───────────▶ │ Browser  │
│ (npm run     │               └──────────┘
│   socket)    │
└──────────────┘
```

- **Next.js app.** Serves the UI and runs every server action. It writes to PostgreSQL, puts notification jobs on a BullMQ queue, and publishes realtime events to Redis.
- **Worker** (`src/lib/services/worker/worker.ts`). Processes the notification jobs: it creates in-app notifications and sends emails.
- **Socket server** (`src/lib/services/socket/server.ts`). Pushes events to connected browsers. A browser authenticates with a short-lived signed token from `/api/socket-token`, and can only join rooms for workspaces it belongs to.

## Getting started

### Prerequisites

- Node.js 20 or later
- Docker, for the local PostgreSQL database
- A Redis server for the queue and real-time events (local Docker works)
- Accounts for Upstash Redis, Cloudinary and an SMTP provider. OAuth apps for Google and GitHub are optional.

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
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

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
SOCKET_AUTH_SECRET=

# Redis: BullMQ queue + realtime pub/sub
REDIS_URL=redis://localhost:6379

# Upstash Redis: rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudinary: task attachments
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

For OAuth, register these callback URLs with Google and GitHub:

- `http://localhost:3000/api/oauth/google/callback`
- `http://localhost:3000/api/oauth/github/callback`

### 3. Start PostgreSQL and Redis

```bash
docker compose up -d                                  # PostgreSQL
docker run -d --name workvanta-redis -p 6379:6379 redis:7  # Redis
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

Run each of these in its own terminal:

```bash
npm run dev      # Next.js app  → http://localhost:3000
npm run worker   # notification worker
npm run socket   # realtime server → http://localhost:3001
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run worker` | Start the BullMQ notification worker |
| `npm run socket` | Start the Socket.IO realtime server (port `SOCKET_PORT` or `PORT`, default `3001`) |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with a coverage report |

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
    api/                   OAuth routes and socket token endpoint
    invite/[token]/        Invitation acceptance
  components/ui/           Shared UI components
  lib/
    auth/                  Sessions, OAuth, 2FA, roles and permissions
    db/                    Prisma clients
    email/                 Email templates and sending
    notifications/         Notification creation
    queue/                 BullMQ queues
    publisher/             Realtime event publishing
    services/              Worker and socket server entry points
    validations/           Zod schemas
  proxy.ts                 Redirects signed-out visitors to sign-in
```

## Testing

```bash
npm test
```

GitHub Actions runs on every push to `main` and every pull request (`.github/workflows/ci.yml`). It type-checks, runs the tests, applies every migration to a fresh PostgreSQL, and fails if `schema.prisma` has changes that no migration covers. Lint runs there too and fails the build on any error.

Tests sit next to the code they cover, as `*.test.ts(x)` files. Pages and server actions are tested with mocked Prisma and auth. The permission rules have their own unit tests in `src/lib/auth/permissions.test.ts`.

## License

Licensed under the [Apache License 2.0](LICENSE).
