import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { EnvironmentSource } from "../../sources/environment.js";
import type { SourceContext } from "../../shared/SourceContext.js";

const ctx: SourceContext = {};

describe("EnvironmentSource", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, saved);
  });

  it("loads all env vars lowercased by default", async () => {
    process.env.DB_HOST = "localhost";
    process.env.DB_PORT = "5432";

    const result = await EnvironmentSource().load(ctx);

    expect(result).toEqual({ db_host: "localhost", db_port: "5432" });
  });

  it("handles values that are empty strings", async () => {
    process.env.EMPTY = "";
    process.env.PRESENT = "yes";

    const result = await EnvironmentSource().load(ctx);

    expect(result).toEqual({ empty: "", present: "yes" });
  });

  it("filters by prefix and strips it from keys", async () => {
    process.env.APP_HOST = "localhost";
    process.env.APP_PORT = "3000";
    process.env.OTHER_VAR = "ignored";

    const result = await EnvironmentSource({ prefix: "APP_" }).load(ctx);

    expect(result).toEqual({ host: "localhost", port: "3000" });
  });

  it("prefix matching is case-insensitive by default", async () => {
    process.env.app_host = "lower";
    process.env.APP_PORT = "upper";

    const result = await EnvironmentSource({ prefix: "APP_" }).load(ctx);

    expect(result).toEqual({ host: "lower", port: "upper" });
  });

  it("preserves key casing when caseSensitive is true", async () => {
    process.env.MyKey = "value";

    const result = await EnvironmentSource({ caseSensitive: true }).load(ctx);

    expect(result).toEqual({ MyKey: "value" });
  });

  it("prefix is case-sensitive when caseSensitive is true", async () => {
    process.env.APP_HOST = "upper";
    process.env.app_port = "lower";

    const result = await EnvironmentSource({
      prefix: "APP_",
      caseSensitive: true,
    }).load(ctx);

    expect(result).toEqual({ HOST: "upper" });
    expect(result).not.toHaveProperty("port");
  });

  it("returns empty record when no env vars are set", async () => {
    const result = await EnvironmentSource().load(ctx);

    expect(result).toEqual({});
  });

  it("returns empty record when no vars match prefix", async () => {
    process.env.OTHER_VAR = "x";

    const result = await EnvironmentSource({ prefix: "APP_" }).load(ctx);

    expect(result).toEqual({});
  });
});
