import { describe, it, expectTypeOf } from "vitest";

import type { ConfigLoaderOptions } from "../config-loader.js";
import { resolveConfig } from "../config-loader.js";
import { configBuilder } from "../builder.js";
import type { Source } from "../source.js";

const asString = (raw: unknown): string => String(raw);
const asNumber = (raw: unknown): number => Number(raw);
const asBoolean = (raw: unknown): boolean => raw === "true";

describe("type inference", () => {
  it("resolveConfig infers flat return type from builder", () => {
    const builder = configBuilder((c) => ({
      host: c.get("host", asString),
      port: c.get("port", asNumber),
      debug: c.get("debug", asBoolean),
    }));

    type Result = Awaited<ReturnType<typeof resolveConfig<ReturnType<typeof builder.resolve>>>>;

    expectTypeOf<Result>().toEqualTypeOf<{
      host: string;
      port: number;
      debug: boolean;
    }>();
  });

  it("configBuilder.resolve returns the correct type", () => {
    const builder = configBuilder((c) => ({
      db: {
        host: c.get("db_host", asString),
        port: c.get("db_port", asNumber),
      },
      cache: {
        enabled: c.get("cache_enabled", asBoolean),
      },
    }));

    type Config = ReturnType<typeof builder.resolve>;

    expectTypeOf<Config>().toEqualTypeOf<{
      db: { host: string; port: number };
      cache: { enabled: boolean };
    }>();
  });

  it("infers array types from parser", () => {
    const asList = (raw: unknown): string[] => String(raw).split(",");

    const builder = configBuilder((c) => ({
      origins: c.get("origins", asList),
    }));

    type Config = ReturnType<typeof builder.resolve>;

    expectTypeOf<Config>().toEqualTypeOf<{ origins: string[] }>();
  });

  it("infers union types from parser", () => {
    const asEnv = (raw: unknown): "dev" | "staging" | "prod" => {
      const val = String(raw);
      if (val === "dev" || val === "staging" || val === "prod") return val;
      throw new Error("invalid env");
    };

    const builder = configBuilder((c) => ({
      env: c.get("env", asEnv),
    }));

    type Config = ReturnType<typeof builder.resolve>;

    expectTypeOf<Config>().toEqualTypeOf<{ env: "dev" | "staging" | "prod" }>();
  });

  it("resolveConfig options accept ConfigBuilder generic correctly", () => {
    const builder = configBuilder((c) => ({
      port: c.get("port", asNumber),
    }));

    type Opts = ConfigLoaderOptions<{ port: number }>;

    expectTypeOf(builder).toMatchTypeOf<Opts["builder"]>();
  });
});
