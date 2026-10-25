import { loadEnvConfig } from "@next/env";
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { kpiGoals, kpiProfiles, users } from "../src/lib/db/schema";
import { describeYearMismatch } from "../src/lib/kpi/cycle";
import { importPayloadSchema } from "../src/lib/kpi/import-payload";
import { profileUpdateSet, runImport, type ImportDeps } from "../src/lib/kpi/import";

// Deliberately avoids "@/lib/env" and "@/lib/db/client": those validate the app's whole env
// schema (e.g. GEMINI_API_KEY). Like seed-admin.ts, this reads only DATABASE_URL.

loadEnvConfig(process.cwd());

const USAGE = "Usage: pnpm kpi:import <export.json> [--map names.json] [--dry-run]";
const mappingSchema = z.record(z.string(), z.string().email());

interface CliArgs {
  file: string;
  mapFile: string | null;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs | null {
  const file = argv.find((arg, index) => !arg.startsWith("--") && argv[index - 1] !== "--map");
  const mapIndex = argv.indexOf("--map");
  const mapFile = mapIndex >= 0 ? (argv[mapIndex + 1] ?? null) : null;
  if (!file || (mapIndex >= 0 && !mapFile)) return null;
  return { file, mapFile, dryRun: argv.includes("--dry-run") };
}

/** An error whose message was written here and is safe to print (it never quotes file contents). */
class CliError extends Error {}

function readJson(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new CliError(`Cannot read ${path}${code ? ` (${code})` : ""}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    // JSON.parse messages quote part of the text, and this file holds personal answers.
    throw new CliError(`${path} is not valid JSON`);
  }
}

// Issue paths and messages only: the payload contains personal answers that must not reach logs.
function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(USAGE);
    return 1;
  }

  const payload = importPayloadSchema.safeParse(readJson(args.file));
  if (!payload.success) {
    console.error(`Invalid export file:\n${describeIssues(payload.error)}`);
    return 1;
  }

  for (const warning of describeYearMismatch(payload.data)) {
    console.warn(`⚠ ${warning}`);
  }

  let mapping: Record<string, string> = {};
  if (args.mapFile) {
    const parsedMapping = mappingSchema.safeParse(readJson(args.mapFile));
    if (!parsedMapping.success) {
      console.error(`Invalid mapping file (expected {"name": "email"}):\n${describeIssues(parsedMapping.error)}`);
      return 1;
    }
    mapping = parsedMapping.data;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    return 1;
  }
  const db = drizzle(neon(databaseUrl));
  console.log(`${args.dryRun ? "[dry run] " : ""}Database host: ${new URL(databaseUrl).host}`);

  const deps: ImportDeps = {
    async findExisting(userId, cycleYear) {
      const [row] = await db
        .select()
        .from(kpiProfiles)
        .where(and(eq(kpiProfiles.userId, userId), eq(kpiProfiles.cycleYear, cycleYear)))
        .limit(1);
      return row ?? null;
    },
    async upsert(profile) {
      await db
        .insert(kpiProfiles)
        .values(profile)
        .onConflictDoUpdate({
          target: [kpiProfiles.userId, kpiProfiles.cycleYear],
          set: profileUpdateSet(profile),
        });
    },
    async countGoals(userId, cycleYear) {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(kpiGoals)
        .where(and(eq(kpiGoals.userId, userId), eq(kpiGoals.cycleYear, cycleYear)));
      return row?.count ?? 0;
    },
    async insertGoals(goals) {
      await db.insert(kpiGoals).values(goals);
    },
  };

  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status })
    .from(users);

  const result = await runImport({
    payload: payload.data,
    users: allUsers,
    mapping,
    deps,
    dryRun: args.dryRun,
  });

  if (result.problems.length > 0) {
    console.error(`Nothing was imported. Fix these first:\n${result.problems.map((p) => `  - ${p}`).join("\n")}`);
    return 1;
  }

  const verb = args.dryRun ? "would be" : "";
  console.log(`✓ Created ${verb}: ${result.created.length}  ${result.created.join(", ")}`);
  console.log(`✓ Updated ${verb}: ${result.updated.length}  ${result.updated.join(", ")}`);
  console.log(`✓ Unchanged: ${result.unchanged.length}  ${result.unchanged.join(", ")}`);
  console.log(`✓ Draft goals added ${verb}: ${result.goalsCreated.length}  ${result.goalsCreated.join(", ")}`);
  if (result.goalsSkipped.length > 0) {
    console.log(
      `! Goals left untouched (already exist for this cycle): ${result.goalsSkipped.join(", ")}`,
    );
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    if (error instanceof CliError) {
      console.error(`✗ ${error.message}`);
    } else {
      // Database errors usually embed the SQL and its parameters, i.e. survey answers and notes.
      // Print only what identifies the failure; re-run with a debugger if the detail is needed.
      const code = (error as { code?: unknown })?.code;
      const name = error instanceof Error ? error.name : "Error";
      console.error(`✗ Import failed (${name}${typeof code === "string" ? `, ${code}` : ""}). Details withheld: they can contain personal data.`);
    }
    process.exit(1);
  });
