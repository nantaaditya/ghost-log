import { createDecipheriv } from "crypto";
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, isNull } from "drizzle-orm";
import { reports, users, onedriveCredentials } from "../src/lib/db/schema";
import { parseReport } from "../src/lib/markdown/parse";

// Deliberately avoids importing "@/lib/env" / "@/lib/graph/*" — those pull in the app's
// full bundled env schema (requires vars unrelated to this script, e.g. GEMINI_API_KEY),
// mirroring the existing scripts/seed-admin.ts pattern of reading only what's needed.

// Minimal .env parser: Node's --env-file mishandles this project's env files (whitespace-only
// blank lines corrupt the parser for the line right after them), so parse manually instead.
function loadEnvFile(path: string): void {
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const envFileArg = process.argv.find((a) => a.startsWith("--env-file="));
if (envFileArg) loadEnvFile(envFileArg.slice("--env-file=".length));

const DATABASE_URL = process.env.DATABASE_URL;
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
const ONEDRIVE_BASE_PATH = process.env.ONEDRIVE_BASE_PATH ?? "nanta-obsidian/work/report";

if (!DATABASE_URL || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !TOKEN_ENCRYPTION_KEY) {
  console.error("Missing required env vars: DATABASE_URL, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

const TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0/me";
const SCOPES = "Files.ReadWrite offline_access User.Read";
const APPLY = process.argv.includes("--apply");

function decrypt(ciphertext: string): string {
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const key = Buffer.from(TOKEN_ENCRYPTION_KEY!, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

async function getAccessToken(): Promise<string> {
  const [creds] = await db.select().from(onedriveCredentials).where(eq(onedriveCredentials.id, "singleton")).limit(1);
  if (!creds) throw new Error("OneDrive not connected — admin must authorize first");

  if (creds.expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return decrypt(creds.accessToken);
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID!,
      client_secret: MICROSOFT_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: decrypt(creds.refreshToken),
      scope: SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function buildReportPath(reporterName: string, weekId: string): string {
  return `${ONEDRIVE_BASE_PATH}/${reporterName}/${weekId}.md`;
}

async function readFile(token: string, drivePath: string): Promise<string> {
  const encoded = encodeURIComponent(drivePath).replace(/%2F/g, "/");
  const res = await fetch(`${GRAPH_BASE}/drive/root:/${encoded}:/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`readFile failed (${res.status})`);
  return res.text();
}

async function main() {
  const rows = await db
    .select({ id: reports.id, weekId: reports.weekId, userName: users.name })
    .from(reports)
    .innerJoin(users, eq(reports.userId, users.id))
    .where(and(eq(reports.status, "submitted"), isNull(reports.healthIndicator)));

  console.log(`Found ${rows.length} submitted report(s) missing health_indicator.`);
  if (rows.length === 0) return;

  const token = await getAccessToken();
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const markdown = await readFile(token, buildReportPath(row.userName, row.weekId));
      const parsed = parseReport(markdown);
      if (!parsed) throw new Error("parseReport returned null (unrecognized format)");

      console.log(
        `${APPLY ? "UPDATE" : "[dry-run] would update"} ${row.userName} ${row.weekId} -> ` +
        `${parsed.healthIndicator} (${parsed.escalations.length} escalations, ${parsed.productionHealth.length} incidents)`
      );

      if (APPLY) {
        await db
          .update(reports)
          .set({
            healthIndicator: parsed.healthIndicator,
            escalationCount: parsed.escalations.length,
            incidentCount: parsed.productionHealth.length,
          })
          .where(eq(reports.id, row.id));
      }
      updated++;
    } catch (err) {
      failed++;
      console.error(`  x ${row.userName} ${row.weekId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`${APPLY ? "Updated" : "Would update"} ${updated}, failed ${failed}.`);
  if (!APPLY) console.log("Re-run with --apply to write these changes.");
}

main().catch((err: unknown) => {
  console.error("Backfill failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
