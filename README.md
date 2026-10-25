# Alamak Team

Weekly engineering report platform for engineering managers. Team members submit structured weekly reports; managers get a consolidated recap, escalation alerts, and an AI-generated executive summary — all stored as Markdown files in OneDrive.

## Features

- **Structured weekly reports** — 6 sections: Escalations & Blockers, Production Health, Tech Debt, Delivery, Look Ahead, and Ghibah Online
- **OneDrive storage** — reports saved as Markdown files in each member's personal OneDrive folder; no separate file storage needed
- **Admin dashboard** — live submission rate, health distribution, and escalations requiring action
- **Weekly recap page** — consolidated view per week with per-team summaries, sprint goal breakdown, and links to individual reports
- **AI executive summary** — one-click Google Gemini summary with team metrics; saved as `{weekId}_summary.md` in OneDrive
- **Invite-based onboarding** — admin sends invite links by email; members set their own password
- **Admin settings** — update name, email, and password from the admin panel
- **First-run bootstrap** — admin account auto-created from env vars on first request; no seed script needed
- **Draft autosave** — report drafts saved to `localStorage` per week
- **1:1 chat and KPI coaching** — private member ⇄ manager conversation at `/coach`, each member's own survey results, and a manager-edited 2027 KPI plan (see [1:1 and KPI coaching](#11-and-kpi-coaching))

## Tech Stack

- [Next.js 16](https://nextjs.org) — App Router, server components, API routes
- [Neon](https://neon.tech) + [Drizzle ORM](https://orm.drizzle.team) — PostgreSQL
- [NextAuth.js](https://next-auth.js.org) — credentials-based auth with JWT sessions
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/) — OneDrive file read/write
- [Google Gemini](https://ai.google.dev) — AI executive summary (`gemini-2.5-flash`, free tier)
- [Nodemailer](https://nodemailer.com) — transactional email via SMTP (Zoho Mail or any SMTP provider)
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS — UI components

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon (or any PostgreSQL) connection string |
| `NEXTAUTH_SECRET` | Random string for JWT signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `ADMIN_EMAIL` | Admin email — used for first-run bootstrap **and** invite creation; keep it set |
| `ADMIN_NAME` | Display name for the initial admin account |
| `ADMIN_PASSWORD` | Password for the initial admin account (min 8 chars) |
| `MICROSOFT_CLIENT_ID` | Azure app registration client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure app registration client secret |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key for encrypting OneDrive tokens (`openssl rand -hex 32`) |
| `ONEDRIVE_BASE_PATH` | Root folder path in OneDrive (e.g. `WeeklyReports`) |
| `EMAIL_FROM` | Sender email address (must match your SMTP account) |
| `EMAIL_PASSWORD` | SMTP password or app password (recommended) |
| `GEMINI_API_KEY` | Google Gemini API key — free at [aistudio.google.com](https://aistudio.google.com) |

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The first request automatically creates the admin account from your `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` env vars.

## First-Run Bootstrap

On the very first request, the app checks whether an admin user exists. If not, it creates one using the three `ADMIN_*` env vars. `ADMIN_NAME` and `ADMIN_PASSWORD` can be removed after first login — but **keep `ADMIN_EMAIL`** as it is also used when creating invite tokens.

## Email Setup (Zoho Mail / SMTP)

The app sends invite emails via SMTP using Nodemailer. Zoho Mail works well and requires no domain verification setup.

1. Enable 2FA on your Zoho account
2. Go to [accounts.zoho.com](https://accounts.zoho.com) → Security → App Passwords → Generate
3. Set `EMAIL_FROM` to your Zoho address and `EMAIL_PASSWORD` to the app password

To use a different SMTP provider, update `host` and `port` in `src/lib/email/send-invite.ts`.

## OneDrive Setup

1. Create an Azure app registration at [portal.azure.com](https://portal.azure.com)
2. Add the redirect URI: `{NEXTAUTH_URL}/api/onedrive/callback`
3. Grant `Files.ReadWrite` and `offline_access` delegated permissions
4. Copy the client ID and secret into env vars
5. In the admin panel → Connect OneDrive

Reports are stored at `{ONEDRIVE_BASE_PATH}/{MemberName}/W{week}-{MM}-{YYYY}.md`.

AI summaries are stored at `{ONEDRIVE_BASE_PATH}/{weekId}_summary.md` (e.g. `WeeklyReports/W4-04-2026_summary.md`).

## 1:1 and KPI coaching

`/coach` gives every member a private thread with their manager, their own results from the 2026
Career & Character self-reflection survey, and a KPI plan the manager shares when ready.

**Who sees what**

| | Member | Admin |
|---|---|---|
| Chat thread | their own | any member's |
| Survey results | their own answers, counts and profile | all of it, plus the manager notes |
| Manager notes (hypotheses, 1:1 openers) | never | yes |
| KPI goals | only goals the manager has **shared** | drafts and shared; create, edit, share, delete |

- Access is decided from the **database** (role and `active` status) on every request, not from the
  session token, so a deactivated or demoted user loses access immediately. Any account with the
  `admin` role can read every thread.
- Survey scores are counts of a pick-1-of-6 question, shown as "N of 12" with no percentages or
  rankings between people. The page says plainly that it is a self-reflection, not a rating.
- Chat uses polling (about every 8 s while the tab is visible), not WebSockets. New messages trigger
  one notification email per sender and thread per 15 minutes; the email never contains the message.
- There is no AI at runtime. Proposals are generated on your own machine (below) and reviewed first.

**Preparing a cycle** (the survey data lives outside this repo, in `~/projects/work/kpi/2026`)

1. Apply the migration: `pnpm db:migrate` (adds `coach_messages`, `kpi_profiles`, `kpi_goals`).
2. Export results: `cd ~/projects/work/kpi/2026 && python3 dashboard/build_dashboard.py --export-json /tmp/kpi-2026.json --no-open`
3. Optional, **sends each person's answers to Claude through your signed-in `claude` CLI**
   (all tools disabled): `pnpm kpi:propose /tmp/kpi-2026.json`. Try one person first with
   `--only "Name"`. It writes `…with-goals.json`, mode 0600. Read and edit the goals.
4. Dry run, then import: `pnpm kpi:import <file> --dry-run`, then without `--dry-run`. Survey
   names must match account names; otherwise pass `--map names.json` (`{"Survey Name": "email"}`).
   Nothing is written if any name is unmatched or ambiguous. Re-importing is safe: unchanged
   people are skipped, notes omitted from an export are kept, and goals a person already has are
   never overwritten. Imported goals are private drafts until you share them in `/coach`.
5. Delete the export files afterwards; they contain personal answers.

The years the page shows are set in `src/lib/kpi/cycle.ts` (`SURVEY_CYCLE_YEAR`, `PLAN_CYCLE_YEAR`);
the import warns if an export would not be visible. The skill framework (card management and
financial systems, plus six behavioral tracks) is a **draft** in `src/lib/kpi/framework/`: review it
against your own job levels before sharing plans.

## Deployment

Run `pnpm db:migrate` **before** deploying a build that includes `/coach`. (The dashboard's unread
badge degrades to 0 if the tables are missing, but `/coach` itself needs them.)

Deploy to [Vercel](https://vercel.com) (recommended):

1. Push to GitHub
2. Import the repo on Vercel
3. Add all env vars in **Settings → Environment Variables**
4. Set `NEXTAUTH_URL` to your production domain
5. Add the production domain to the Azure app registration's allowed redirect URIs
6. Redeploy after setting `NEXTAUTH_URL`

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm db:migrate` | Run pending Drizzle migrations |
| `pnpm db:push` | Push schema changes directly (dev shortcut) |
| `pnpm db:generate` | Generate migration files from schema changes |
| `pnpm kpi:propose <export.json>` | Draft KPI goals per person with your local `claude` CLI (tools disabled) |
| `pnpm kpi:import <export.json>` | Import 2026 survey results and draft goals (`--dry-run`, `--map`) |
