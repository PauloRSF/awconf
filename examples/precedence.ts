import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveConfig,
  EnvironmentSource,
  EnvironmentFileSource,
  JsonFileSource,
} from "@awconf/core";
import { configBuilder } from "@awconf/zod";

// Demonstrates using all built-in sources together.
//
// Priority (last-wins): JSON file < .env file < environment variables
//
// Each source can provide different keys — they all get merged into a
// single flat key-value map before the builder runs.

async function main() {
  const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

  // Override a couple of keys via real env vars (highest priority).
  process.env["DB.HOST"] = "env-var-host";
  process.env.NODE_ENV = "production";

  const config = await resolveConfig({
    mergeStrategy: "last-wins",
    sources: [
      // 1. JSON file — lowest priority, good for structured defaults
      JsonFileSource({ file: join(fixtures, "config.json") }),
      // 2. .env file — overrides JSON
      EnvironmentFileSource({ file: join(fixtures, ".env.example") }),
      // 3. Real environment — highest priority
      EnvironmentSource(),
    ],
    builder: configBuilder(({ get, z }) => ({
      app: {
        name: get("app.name", z.string()),
        version: get("app.version", z.string()),
      },
      db: {
        host: get("db.host", z.string()),
        port: get("db.port", z.coerce.number().default(5432)),
        user: get("db.user", z.string()),
        pass: get("db.pass", z.string()),
      },
      env: get("node_env", z.enum(["development", "staging", "production"]).default("development")),
      logLevel: get("log_level", z.enum(["debug", "info", "warn", "error"]).default("info")),
    })),
  });

  console.log(config);
}

main();
