import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfig, JsonFileSource, EnvironmentSource } from "@awconf/core";
import { configBuilder } from "@awconf/zod";

// JSON files use dot-separated keys for nested values.
// Given fixtures/config.json:
//
//   { "db": { "host": "...", "port": 5432, ... }, "redis": { "url": "..." } }
//
// Keys become: "db.host", "db.port", "db.user", "db.pass", "redis.url"
//
// Environment variables override JSON values (loaded last).

async function main() {
  const config = await resolveConfig({
    mergeStrategy: "last-wins",
    sources: [
      JsonFileSource({ file: join(dirname(fileURLToPath(import.meta.url)), "fixtures", "config.json") }),
      EnvironmentSource({ prefix: "APP_" }),
    ],
    builder: configBuilder(({ get, z }) => ({
      db: {
        host: get("db.host", z.string()),
        port: get("db.port", z.coerce.number()),
        user: get("db.user", z.string()),
        pass: get("db.pass", z.string()),
      },
      redis: {
        url: get("redis.url", z.string().url()),
      },
    })),
  });

  console.log(config);
}

main();
