import type { Config } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

loadEnvConfig(process.cwd());

// Node.js <21 has no built-in WebSocket — required by @neondatabase/serverless
neonConfig.webSocketConstructor = ws;

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
