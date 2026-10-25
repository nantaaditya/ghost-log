import { spawn } from "child_process";
import { chmodSync, readFileSync, renameSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { parsePlanningYear } from "../src/lib/kpi/cycle";
import { importPayloadSchema } from "../src/lib/kpi/import-payload";
import { generateProposals, ProposalError } from "../src/lib/kpi/proposals";

// Runs on the manager's own machine, through the `claude` CLI that is already signed in, with every
// tool disabled (it can only answer text). Nothing is sent anywhere else. Mirrors the dashboard's
// insights.py. Run it deliberately: each person's survey answers are sent to Claude.

const USAGE =
  'Usage: pnpm kpi:propose <export.json> [--out file.json] [--year 2027] [--only "Name"] [--model name]';
const DISALLOWED_TOOLS = "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,NotebookEdit,Task";
const CLAUDE_TIMEOUT_MS = 240_000;
const PRIVATE_FILE_MODE = 0o600;
const MODEL_NAME = /^[A-Za-z0-9._:[\]-]+$/;

interface CliArgs {
  file: string;
  out: string;
  year: string | null;
  only: string | null;
  model: string | null;
}

function valueOf(argv: string[], flag: string): string | null {
  const index = argv.indexOf(flag);
  return index >= 0 ? (argv[index + 1] ?? null) : null;
}

function parseArgs(argv: string[]): CliArgs | null {
  const flagValues = new Set(["--out", "--year", "--only", "--model"]);
  const file = argv.find((arg, index) => !arg.startsWith("--") && !flagValues.has(argv[index - 1] ?? ""));
  if (!file) return null;
  return {
    file,
    out: valueOf(argv, "--out") ?? file.replace(/\.json$/, "") + ".with-goals.json",
    year: valueOf(argv, "--year"),
    only: valueOf(argv, "--only"),
    model: valueOf(argv, "--model"),
  };
}

function runClaude(prompt: string, model: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    // Survey answers are untrusted text, so give the model nothing to act with: no built-in tools
    // (an allowlist of none, plus the deny-list as a second lock), no MCP servers, no slash
    // commands, and a neutral working directory so no project settings or CLAUDE.md are loaded.
    const args = [
      "-p",
      "--no-session-persistence",
      "--tools",
      "",
      "--strict-mcp-config",
      "--disable-slash-commands",
      "--disallowedTools",
      DISALLOWED_TOOLS,
    ];
    if (model) args.push("--model", model);
    const child = spawn("claude", args, { stdio: ["pipe", "pipe", "pipe"], cwd: tmpdir() });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`claude -p took longer than ${CLAUDE_TIMEOUT_MS / 1000}s`));
    }, CLAUDE_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(new Error(error.code === "ENOENT" ? "the `claude` command was not found" : error.message));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude -p failed (code ${code}): ${stderr.trim().slice(0, 200)}`));
    });
    child.stdin.end(prompt);
  });
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(USAGE);
    return 1;
  }

  let raw: { people: Array<Record<string, unknown>>; cycleYear: number };
  try {
    raw = JSON.parse(readFileSync(args.file, "utf8"));
  } catch (error) {
    console.error(`Cannot read ${args.file}: ${error instanceof Error ? error.message : "unknown error"}`);
    return 1;
  }
  const payload = importPayloadSchema.safeParse(raw);
  if (!payload.success) {
    const issues = payload.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    console.error(`Invalid export file:\n${issues.join("\n")}`);
    return 1;
  }

  if (args.model && !MODEL_NAME.test(args.model)) {
    console.error(`--model "${args.model}" does not look like a model name.`);
    return 1;
  }
  // Keep the year already in the file, if any, rather than silently replacing it.
  const planningYear = parsePlanningYear(args.year, payload.data.goalsCycleYear ?? payload.data.cycleYear + 1);
  if (planningYear === null) {
    console.error(`--year "${args.year}" must be a four-digit year between 2026 and 2100.`);
    return 1;
  }
  const targets = payload.data.people
    .map((person, index) => ({ person, index }))
    .filter(({ person }) => !args.only || person.nama.toLowerCase() === args.only.toLowerCase());
  if (targets.length === 0) {
    console.error(`No one in the export matches --only "${args.only}".`);
    return 1;
  }

  const people = raw.people.map((entry) => ({ ...entry }));
  let failures = 0;
  for (const { person, index } of targets) {
    if (person.goals.length > 0) {
      console.log(`- ${person.nama}: already has ${person.goals.length} goals, skipped`);
      continue;
    }
    try {
      console.log(`… ${person.nama}: asking Claude (about a minute)`);
      const goals = await generateProposals({
        person,
        cycleYear: planningYear,
        run: (prompt) => runClaude(prompt, args.model),
      });
      people[index] = { ...people[index], goals };
      console.log(`✓ ${person.nama}: ${goals.length} goals proposed`);
    } catch (error) {
      failures += 1;
      const reason = error instanceof ProposalError || error instanceof Error ? error.message : "unknown error";
      console.error(`✗ ${person.nama}: ${reason}`);
    }
  }

  const temp = `${args.out}.tmp`;
  writeFileSync(temp, JSON.stringify({ ...raw, goalsCycleYear: planningYear, people }, null, 1), {
    mode: PRIVATE_FILE_MODE,
  });
  // `mode` only applies when the file is created; a stale temp file could keep looser permissions.
  chmodSync(temp, PRIVATE_FILE_MODE);
  renameSync(temp, args.out);
  console.log(`Wrote ${args.out}. Review and edit the goals, then: pnpm kpi:import ${args.out} --dry-run`);
  return failures > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error("✗ Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
