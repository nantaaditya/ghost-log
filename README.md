# Alamak Team

Weekly engineering report platform for engineering managers. Team members submit structured weekly reports; managers get a consolidated recap, escalation alerts, and an AI-generated executive summary — all stored as Markdown files in OneDrive.

## Features

- **Structured weekly reports** — 6 sections: Escalations & Blockers, Production Health, Tech Debt, Delivery, Look Ahead, and Ghibah Online
- **OneDrive storage** — reports saved as Markdown files in each member's personal OneDrive folder; no separate file storage needed
- **Admin dashboard** — live submission rate, health distribution, and escalations requiring action
- **Weekly recap page** — consolidated view per week with per-team summaries, sprint goal breakdown, and links to individual reports
- **AI executive summary** — one-click Anthropic-powered summary for weekly catchup emails
- **Invite-based onboarding** — admin sends invite links by email; members set their own password
- **Admin settings** — update name, email, and password from the admin panel
- **First-run bootstrap** — admin account auto-created from env vars on first request; no seed script needed
- **Draft autosave** — report drafts saved to `localStorage` per week

## Tech Stack

- [Next.js 16](https://nextjs.org) — App Router, server components, API routes
- [Neon](https://neon.tech) + [Drizzle ORM](https://orm.drizzle.team) — PostgreSQL
- [NextAuth.js](https://next-auth.js.org) — credentials-based auth with JWT sessions
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/) — OneDrive file read/write
- [Anthropic Claude](https://www.anthropic.com) — AI executive summary (`claude-haiku-4-5`)
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
| `ANTHROPIC_API_KEY` | Anthropic API key for AI summaries |

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

## Deployment

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
