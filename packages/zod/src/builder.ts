import { z, type ZodType, type ZodTypeDef } from "zod";
import type { ConfigBuilder, ConfigKeyError } from "@awconf/core";
import {
  ConfigError,
  ConfigMissingKeyError,
  ConfigKeyParseError,
} from "@awconf/core";

/**
 * Context passed to the {@link configBuilder} callback when using the Zod
 * adapter. Provides `get` for declaring keys with Zod schemas and a `z`
 * reference so you don't need to import Zod directly.
 */
export interface BuilderContext {
  /**
   * Declare a config key validated by a Zod schema.
   * @param key    - The config key name (case-insensitive).
   * @param schema - A Zod schema. Use `.default()` for optional keys.
   */
  get<T>(key: string, schema: ZodType<T, ZodTypeDef, unknown>): T;

  /** The Zod namespace — equivalent to `import { z } from "zod"`. */
  z: typeof z;
}

/**
 * Creates a {@link ConfigBuilder} that validates values with Zod schemas.
 *
 * The callback receives a {@link BuilderContext} whose `get` method declares
 * each key and its Zod schema. All validation errors are collected and thrown
 * together as a single `ConfigError`.
 *
 * Raw values are never included in error messages to prevent sensitive data
 * leaks.
 *
 * @example
 * ```typescript
 * import { configBuilder } from "@awconf/zod";
 *
 * const builder = configBuilder(({ get, z }) => ({
 *   port: get("port", z.coerce.number().default(3000)),
 *   host: get("host", z.string().default("0.0.0.0")),
 * }));
 * ```
 */
export function configBuilder<T>(
  fn: (c: BuilderContext) => T,
): ConfigBuilder<T> {
  return {
    resolve(values: Record<string, unknown>): T {
      const errors: ConfigKeyError[] = [];

      const ctx: BuilderContext = {
        z,
        get<V>(key: string, schema: ZodType<V, ZodTypeDef, unknown>): V {
          const raw = values[key.toLowerCase()];

          if (raw === undefined) {
            const fallback = schema.safeParse(undefined);

            if (fallback.success) return fallback.data;

            errors.push(new ConfigMissingKeyError(key));

            return undefined as V;
          }

          const result = schema.safeParse(raw);

          if (result.success) return result.data;

          const messages = result.error.issues
            .map((i) => sanitizeMessage(i.message))
            .join("; ");

            errors.push(new ConfigKeyParseError(key, messages));

            return undefined as V;
        },
      };

      const result = fn(ctx);

      if (errors.length > 0) throw new ConfigError(errors);

      return result;
    },
  };
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/,\s*received\s+.*$/i, "")
    .replace(/\s*received\s+.*$/i, "");
}
