import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { EnvironmentFileSource } from "../../sources/environment-file.js";
import type { SourceContext } from "../../shared/SourceContext.js";

const noop = () => {};
const ctx: SourceContext = {
  logger: { debug: noop, info: noop, warn: noop, error: noop },
};

describe("Environment file source", () => {
  it("loads values from a environment file", async () => {
    const source = EnvironmentFileSource({ file: join(import.meta.dirname, "..", "fixtures", "valid.env") });

    const result = await source.load(ctx);  

    expect(result).toEqual({
      this_is_text: "foo",
      this_is_a_number: "4242",
      value_with_spaces: "baz bar",
      timeout_ms: "3000",
    });
  });

  it("throws for missing file by default", async () => {
    const source = EnvironmentFileSource({ file: "/nonexistent/.env" });

    await expect(source.load(ctx)).rejects.toThrow("Failed to read env file");
  });

  it("returns empty for missing file when optional", async () => {
    const source = EnvironmentFileSource({
      file: "/nonexistent/.env",
      optional: true,
    });

    const result = await source.load(ctx);

    expect(result).toEqual({});
  });
});
