import { resolveConfig, configBuilder, type Source } from "@awconf/core";
import { string, oneOf } from "./example-helpers.js";

// Implement the Source interface to create your own source.
// A source just needs a name and a load() method that returns key-value pairs.

function StaticSource(values: Record<string, string>): Source {
  return {
    name: "static",
    async load() {
      return values;
    },
  };
}

// Example: a source that fetches config from an HTTP endpoint.
function HttpSource(url: string): Source {
  return {
    name: `http(${url})`,
    async load() {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch config from ${url}: ${res.status}`);

      const data = await res.json();
      const result: Record<string, string> = {};

      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (value !== null && value !== undefined) {
          result[key] = String(value);
        }
      }

      return result;
    },
  };
}

async function main() {
  const config = await resolveConfig({
    mergeStrategy: "last-wins",
    sources: [
      StaticSource({ app_name: "my-app", log_level: "info" }),
      // HttpSource("https://config.internal/my-app"),
    ],
    builder: configBuilder((c) => ({
      appName: c.get("app_name", string),
      logLevel: c.get("log_level", oneOf("debug", "info", "warn", "error")),
    })),
  });

  console.log(config);
}

main();
