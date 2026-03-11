import { describe, it, expect } from "vitest";

import { resolveConfig } from "../config-loader.js";
import { configBuilder } from "../builder.js";
import {
  ConfigError,
  ConfigMissingKeyError,
  ConfigKeyParseError,
} from "../builder.js";
import type { Source } from "../source.js";

function staticSource(
  name: string,
  values: Record<string, string>,
): Source {
  return { name, load: async () => values };
}

const asString = (raw: unknown): string => {
  if (typeof raw !== "string") throw new Error("expected string");
  return raw;
};

const asNumber = (raw: unknown): number => {
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error("expected number");
  return n;
};

const asBoolean = (raw: unknown): boolean => {
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new Error("expected boolean");
};

describe("resolveConfig", () => {
  it("resolves config from a single source", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { db_user: "admin", db_port: "5432" })],
      builder: configBuilder((c) => ({
        user: c.get("db_user", asString),
        port: c.get("db_port", asNumber),
      })),
    });

    expect(config).toEqual({ user: "admin", port: 5432 });
  });

  it("normalizes keys to lowercase", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { DB_USER: "admin" })],
      builder: configBuilder((c) => ({
        user: c.get("db_user", asString),
      })),
    });

    expect(config).toEqual({ user: "admin" });
  });

  it("supports nested config objects", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [
        staticSource("test", {
          db_user: "admin",
          db_pass: "secret",
          db_port: "5432",
          cache_enabled: "true",
        }),
      ],
      builder: configBuilder((c) => ({
        db: {
          user: c.get("db_user", asString),
          pass: c.get("db_pass", asString),
          port: c.get("db_port", asNumber),
        },
        cache: {
          enabled: c.get("cache_enabled", asBoolean),
        },
      })),
    });

    expect(config).toEqual({
      db: { user: "admin", pass: "secret", port: 5432 },
      cache: { enabled: true },
    });
  });
});

describe("mergeStrategy", () => {
  it("last-wins: later sources override earlier ones", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [
        staticSource("defaults", { db_host: "localhost", db_port: "3306" }),
        staticSource("overrides", { db_port: "5432" }),
      ],
      builder: configBuilder((c) => ({
        host: c.get("db_host", asString),
        port: c.get("db_port", asNumber),
      })),
    });

    expect(config).toEqual({ host: "localhost", port: 5432 });
  });

  it("first-wins: earlier sources take precedence", async () => {
    const config = await resolveConfig({
      mergeStrategy: "first-wins",
      sources: [
        staticSource("primary", { db_host: "primary-host", db_port: "3306" }),
        staticSource("fallback", { db_host: "fallback-host", db_port: "5432", db_name: "mydb" }),
      ],
      builder: configBuilder((c) => ({
        host: c.get("db_host", asString),
        port: c.get("db_port", asNumber),
        name: c.get("db_name", asString),
      })),
    });

    expect(config).toEqual({ host: "primary-host", port: 3306, name: "mydb" });
  });

  it("first-wins: still picks up keys only in later sources", async () => {
    const config = await resolveConfig({
      mergeStrategy: "first-wins",
      sources: [
        staticSource("primary", { db_host: "primary-host" }),
        staticSource("fallback", { db_port: "5432" }),
      ],
      builder: configBuilder((c) => ({
        host: c.get("db_host", asString),
        port: c.get("db_port", asNumber),
      })),
    });

    expect(config).toEqual({ host: "primary-host", port: 5432 });
  });
});

describe("configBuilder.get", () => {
  it("parses strings", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { name: "alice" })],
      builder: configBuilder((c) => ({
        name: c.get("name", asString),
      })),
    });

    expect(config).toEqual({ name: "alice" });
  });

  it("parses numbers", async () => {
    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { port: "5432" })],
      builder: configBuilder((c) => ({
        port: c.get("port", asNumber),
      })),
    });

    expect(config).toEqual({ port: 5432 });
  });

  it("applies custom transforms", async () => {
    const asList = (raw: unknown): string[] => {
      if (typeof raw !== "string") throw new Error("expected string");
      return raw.split(",").map((v) => v.trim());
    };

    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", { origins: "a.com, b.com, c.com" })],
      builder: configBuilder((c) => ({
        origins: c.get("origins", asList),
      })),
    });

    expect(config).toEqual({ origins: ["a.com", "b.com", "c.com"] });
  });

  it("supports defaults via parser logic", async () => {
    const withDefault = <T>(parser: (raw: unknown) => T, fallback: T) =>
      (raw: unknown): T => (raw === undefined ? fallback : parser(raw));

    const config = await resolveConfig({
      mergeStrategy: "last-wins",
      sources: [staticSource("test", {})],
      builder: configBuilder((c) => ({
        port: c.get("port", withDefault(asNumber, 3000)),
        debug: c.get("debug", withDefault(asBoolean, false)),
      })),
    });

    expect(config).toEqual({ port: 3000, debug: false });
  });

  it("throws ConfigError for a single missing key", async () => {
    await expect(
      resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", {})],
        builder: configBuilder((c) => c.get("missing", asString)),
      }),
    ).rejects.toThrow(ConfigError);
  });

  it("throws ConfigError for invalid parse", async () => {
    await expect(
      resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", { port: "abc" })],
        builder: configBuilder((c) => c.get("port", asNumber)),
      }),
    ).rejects.toThrow(ConfigError);
  });
});

describe("error pooling", () => {
  it("collects multiple missing key errors at once", async () => {
    try {
      await resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", {})],
        builder: configBuilder((c) => ({
          host: c.get("db_host", asString),
          port: c.get("db_port", asNumber),
          user: c.get("db_user", asString),
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

  it("collects a mix of missing and parse errors", async () => {
    try {
      await resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", { db_port: "abc" })],
        builder: configBuilder((c) => ({
          host: c.get("db_host", asString),
          port: c.get("db_port", asNumber),
        })),
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const configErr = err as ConfigError;
      expect(configErr.errors).toHaveLength(2);
      expect(configErr.errors[0]).toBeInstanceOf(ConfigMissingKeyError);
      expect((configErr.errors[0] as ConfigMissingKeyError).key).toBe("db_host");
      expect(configErr.errors[1]).toBeInstanceOf(ConfigKeyParseError);
      expect((configErr.errors[1] as ConfigKeyParseError).key).toBe("db_port");
    }
  });

  it("produces a readable multi-line error message", async () => {
    try {
      await resolveConfig({
        mergeStrategy: "last-wins",
        sources: [staticSource("test", { db_port: "xyz" })],
        builder: configBuilder((c) => ({
          host: c.get("db_host", asString),
          port: c.get("db_port", asNumber),
        })),
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("2 error(s)");
      expect(msg).toContain('Missing required config key: "db_host"');
      expect(msg).toContain('Cannot parse config key "db_port"');
    }
  });
});
