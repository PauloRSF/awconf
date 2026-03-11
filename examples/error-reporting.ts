import {
  resolveConfig,
  EnvironmentSource,
  ConfigError,
  ConfigMissingKeyError,
  ConfigKeyParseError,
} from "@awconf/core";
import { configBuilder } from "@awconf/zod";

async function main() {
  process.env.DB_PORT = "not-a-number";
  process.env.NODE_ENV = "invalid";
  process.env.LOG_LEVEL = "verbose";

  try {
    await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [EnvironmentSource()],
      builder: configBuilder(({ get, z }) => ({
        db: {
          host: get("db_host", z.string()),
          port: get("db_port", z.coerce.number().int()),
          user: get("db_user", z.string()),
          pass: get("db_pass", z.string()),
        },
        env: get("node_env", z.enum(["development", "staging", "production"])),
        logLevel: get("log_level", z.enum(["debug", "info", "warn", "error"])),
        port: get("port", z.coerce.number().default(3000)),
      })),
    });
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);

      console.error("\nBreakdown:");

      for (const e of err.errors) {
        if (e instanceof ConfigMissingKeyError) {
          console.error(`  MISSING: ${e.key}`);
        } else if (e instanceof ConfigKeyParseError) {
          console.error(`  INVALID: ${e.key} — ${e.reason}`);
        }
      }
    }
  }
}

main();
