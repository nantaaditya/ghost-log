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
- **Draft autosave** — report drafts saved to `localStorage` per week

## Tech Stack

- [Next.js 16](https://nextjs.org) — App Router, server components, API routes
- [Neon](https://neon.tech) + [Drizzle ORM](https://orm.drizzle.team) — PostgreSQL
- [NextAuth.js](https://next-auth.js.org) — credentials-based auth with JWT sessions
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/) — OneDrive file read/write
- [Anthropic Claude](https://www.anthropic.com) — AI executive summary (`claude-haiku-4-5`)
- [Resend](https://resend.com) — transactional email for invite links
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS — UI components

## Getting Started

### 1. Install dependencies

```bash
npm install
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
| `ADMIN_EMAIL` | Email address for the initial admin account |
| `ADMIN_NAME` | Display name for the initial admin account |
| `ADMIN_PASSWORD` | Password for the initial admin account (min 8 chars) |
| `MICROSOFT_CLIENT_ID` | Azure app registration client ID |
| `MICROSOFT_CLIENT_SECRET` | Azure app registration client secret |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key for encrypting OneDrive tokens (`openssl rand -hex 32`) |
| `ONEDRIVE_BASE_PATH` | Root folder path in OneDrive (e.g. `WeeklyReports`) |
| `RESEND_API_KEY` | Resend API key for invite emails |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI summaries |

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first request will automatically create the admin account from your `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` env vars.

## First-Run Bootstrap

On the very first request, the app checks whether an admin user exists. If not, it creates one using the three `ADMIN_*` env vars. After the admin account is created, those vars can be removed — they are never used again.

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

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run db:migrate` | Run pending Drizzle migrations |
| `npm run db:push` | Push schema changes directly (dev shortcut) |
