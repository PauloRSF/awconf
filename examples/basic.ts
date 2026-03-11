import { resolveConfig, EnvironmentSource, EnvironmentFileSource, configBuilder } from "@awconf/core";
import { withDefault, number, string, boolean } from "./example-helpers.js";

async function main() {
  const config = await resolveConfig({
    mergeStrategy: "last-wins",
    sources: [
      EnvironmentFileSource({ file: ".env", optional: true }),
      EnvironmentSource(),
    ],
    builder: configBuilder((c) => ({
      port: c.get("port", withDefault(number, 3000)),
      host: c.get("host", withDefault(string, "0.0.0.0")),
      debug: c.get("debug", withDefault(boolean, false)),
    })),
  });

  console.log(config);
}

main();
