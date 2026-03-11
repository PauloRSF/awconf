import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { JsonFileSource } from "../../sources/json-file.js";
import type { SourceContext } from "../../shared/SourceContext.js";

const noop = () => {};
const ctx: SourceContext = {
  logger: { debug: noop, info: noop, warn: noop, error: noop },
};

describe("JSON file source", () => {
  it("loads and flattens a JSON file", async () => {
    const source = JsonFileSource({ file: join(import.meta.dirname, "..", "fixtures", "valid.json") });

    const result = await source.load(ctx);

    expect(result).toEqual({
      this_is_text: "foo",
      this_is_a_number: 4242,
      value_with_spaces: "baz bar",
      array: ["foo", "bar", "baz"],
      "nested.nested_text": "foo",
      "nested.nested_number": 4242,
      "nested.nested_value_with_spaces": "baz bar",
      "nested.even_more_nested.even_more_nested_text": "foo",
      "nested.even_more_nested.even_more_nested_number": 4242,
      "nested.even_more_nested.even_more_nested_value_with_spaces": "baz bar",
    });
  });

  it("throws for missing file by default", async () => {
    const source = JsonFileSource({ file: "/nonexistent/config.json" });

    await expect(source.load(ctx)).rejects.toThrow("Failed to read JSON file");
  });

  it("returns empty for missing file when optional", async () => {
    const source = JsonFileSource({
      file: "/nonexistent/missing.json",
      optional: true,
    });

    const result = await source.load(ctx);

    expect(result).toEqual({});
  });

  it("throws for non-object JSON root", async () => {
    const source = JsonFileSource({ file: join(import.meta.dirname, "..", "fixtures", "not-an-object.json") });

    await expect(source.load(ctx)).rejects.toThrow("must contain an object");
  });
});
