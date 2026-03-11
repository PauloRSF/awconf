import { describe, it, expect } from "vitest";

import { resolveConfig } from "../config-loader.js";
import { configBuilder } from "../builder.js";
import { SourceLoadError } from "../errors.js";
import type { Source } from "../source.js";

function staticSource(
  name: string,
  values: Record<string, string>,
): Source {
  return { name, load: async () => values };
}

function failingSource(name: string, error: Error): Source {
  return {
    name,
    load: async () => {
      throw error;
    },
  };
}

const asString = (raw: unknown): string => {
  if (typeof raw !== "string") throw new Error("expected string");
  return raw;
};

describe("source load failures", () => {
  it("wraps source errors in SourceLoadError with source name", async () => {
    const original = new Error("connection refused");

    await expect(
      resolveConfig({
        mergeStrategy: "last-wins",
        sources: [failingSource("aws-secrets", original)],
        builder: configBuilder((c) => ({
          key: c.get("key", asString),
        })),
      }),
    ).rejects.toSatisfy((err) => {
      expect(err).toBeInstanceOf(SourceLoadError);
      const sErr = err as SourceLoadError;
      expect(sErr.sourceName).toBe("aws-secrets");
      expect(sErr.cause).toBe(original);
      expect(sErr.message).toContain("aws-secrets");
      expect(sErr.message).toContain("connection refused");
      return true;
    });
  });

  it("fails on the first source that rejects", async () => {
    await expect(
      resolveConfig({
        mergeStrategy: "last-wins",
        sources: [
          staticSource("good", { key: "value" }),
          failingSource("bad", new Error("boom")),
          staticSource("also-good", { key: "other" }),
        ],
        builder: configBuilder((c) => ({
          key: c.get("key", asString),
        })),
      }),
    ).rejects.toSatisfy((err) => {
      expect(err).toBeInstanceOf(SourceLoadError);
      expect((err as SourceLoadError).sourceName).toBe("bad");
      return true;
    });
  });
});

describe("edge cases", () => {
  it("resolves with empty sources array", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [],
      builder: configBuilder((c) => ({
        port: c.get("port", (raw) => (raw === undefined ? 3000 : Number(raw))),
      })),
    });

    expect(config).toEqual({ port: 3000 });
  });

  it("handles source returning empty record", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("empty", {})],
      builder: configBuilder((c) => ({
        port: c.get("port", (raw) => (raw === undefined ? 3000 : Number(raw))),
      })),
    });

    expect(config).toEqual({ port: 3000 });
  });

  it("handles keys with special characters", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [
        staticSource("test", {
          "app.db.host": "localhost",
          "key-with-dashes": "dashed",
          "key_with_underscores": "underscored",
        }),
      ],
      builder: configBuilder((c) => ({
        dbHost: c.get("app.db.host", asString),
        dashed: c.get("key-with-dashes", asString),
        underscored: c.get("key_with_underscores", asString),
      })),
    });

    expect(config).toEqual({
      dbHost: "localhost",
      dashed: "dashed",
      underscored: "underscored",
    });
  });

  it("handles empty string values", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { key: "" })],
      builder: configBuilder((c) => ({
        key: c.get("key", asString),
      })),
    });

    expect(config).toEqual({ key: "" });
  });
});
