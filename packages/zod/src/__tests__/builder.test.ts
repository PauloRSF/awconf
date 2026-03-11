import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  resolveConfig,
  ConfigError,
  ConfigMissingKeyError,
  ConfigKeyParseError,
} from "@awconf/core";
import type { Source } from "@awconf/core";
import { configBuilder } from "../builder.js";

function staticSource(
  name: string,
  values: Record<string, string>,
): Source {
  return { name, load: async () => values };
}

describe("configBuilder", () => {
  it("validates a string with z.string()", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { name: "alice" })],
      builder: configBuilder((c) => ({
        name: c.get("name", z.string()),
      })),
    });

    expect(config).toEqual({ name: "alice" });
  });

  it("coerces a number with z.coerce.number()", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { port: "5432" })],
      builder: configBuilder((c) => ({
        port: c.get("port", z.coerce.number().int().positive()),
      })),
    });

    expect(config).toEqual({ port: 5432 });
  });

  it("coerces a boolean with z.coerce.boolean()", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { debug: "true" })],
      builder: configBuilder((c) => ({
        debug: c.get("debug", z.coerce.boolean()),
      })),
    });

    expect(config).toEqual({ debug: true });
  });

  it("applies transforms", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { origins: "a.com, b.com, c.com" })],
      builder: configBuilder((c) => ({
        origins: c.get(
          "origins",
          z.string().transform((s) => s.split(",").map((v) => v.trim())),
        ),
      })),
    });

    expect(config).toEqual({ origins: ["a.com", "b.com", "c.com"] });
  });

  it("validates enums", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { env: "production" })],
      builder: configBuilder((c) => ({
        env: c.get("env", z.enum(["development", "production", "test"])),
      })),
    });

    expect(config).toEqual({ env: "production" });
  });

  it("uses schema defaults for missing keys", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", {})],
      builder: configBuilder((c) => ({
        port: c.get("port", z.coerce.number().default(3000)),
        debug: c.get("debug", z.coerce.boolean().default(false)),
      })),
    });

    expect(config).toEqual({ port: 3000, debug: false });
  });

  it("makes keys optional via z.optional()", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { existing: "value" })],
      builder: configBuilder((c) => ({
        present: c.get("existing", z.string()),
        absent: c.get("missing", z.string().optional()),
      })),
    });

    expect(config).toEqual({ present: "value", absent: undefined });
  });

  it("throws ConfigError for a single missing key", async () => {
    await expect(
      resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", {})],
        builder: configBuilder((c) => c.get("missing", z.string())),
      }),
    ).rejects.toThrow(ConfigError);
  });

  it("throws ConfigError for invalid coercion", async () => {
    await expect(
      resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", { port: "abc" })],
        builder: configBuilder((c) =>
          c.get("port", z.coerce.number().int().positive()),
        ),
      }),
    ).rejects.toThrow(ConfigError);
  });

  it("throws ConfigError for invalid enum value", async () => {
    await expect(
      resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", { env: "invalid" })],
        builder: configBuilder((c) =>
          c.get("env", z.enum(["development", "production"])),
        ),
      }),
    ).rejects.toThrow(ConfigError);
  });
});

describe("configBuilder error pooling", () => {
  it("collects multiple missing key errors at once", async () => {
    try {
      await resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", {})],
        builder: configBuilder((c) => ({
          host: c.get("db_host", z.string()),
          port: c.get("db_port", z.coerce.number()),
          user: c.get("db_user", z.string()),
        })),
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const configErr = err as ConfigError;
      expect(configErr.errors).toHaveLength(3);
      expect(configErr.errors[0]).toBeInstanceOf(ConfigMissingKeyError);
      expect(configErr.errors[1]).toBeInstanceOf(ConfigMissingKeyError);
      expect(configErr.errors[2]).toBeInstanceOf(ConfigMissingKeyError);
      expect(configErr.errors.map((e) => (e as ConfigMissingKeyError).key)).toEqual([
        "db_host",
        "db_port",
        "db_user",
      ]);
    }
  });

  it("collects a mix of missing and validation errors", async () => {
    try {
      await resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", { db_port: "abc", env: "invalid" })],
        builder: configBuilder((c) => ({
          host: c.get("db_host", z.string()),
          port: c.get("db_port", z.coerce.number().int().positive()),
          env: c.get("env", z.enum(["development", "production"])),
        })),
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const configErr = err as ConfigError;
      expect(configErr.errors).toHaveLength(3);
      expect(configErr.errors[0]).toBeInstanceOf(ConfigMissingKeyError);
      expect((configErr.errors[0] as ConfigMissingKeyError).key).toBe("db_host");
      expect(configErr.errors[1]).toBeInstanceOf(ConfigKeyParseError);
      expect((configErr.errors[1] as ConfigKeyParseError).key).toBe("db_port");
      expect(configErr.errors[2]).toBeInstanceOf(ConfigKeyParseError);
      expect((configErr.errors[2] as ConfigKeyParseError).key).toBe("env");
    }
  });

  it("does not leak raw values in error messages", async () => {
    try {
      await resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", { env: "secret-value-123" })],
        builder: configBuilder((c) => ({
          env: c.get("env", z.enum(["development", "production"])),
        })),
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("secret-value-123");
    }
  });
});
