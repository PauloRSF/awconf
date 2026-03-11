import type { Source } from "../source.js";

/**
 * Options for {@link EnvironmentSource}.
 */
export interface EnvironmentSourceOptions {
  /**
   * Only load env vars matching this prefix (e.g. `"APP_"`).
   * The prefix is stripped from the resulting keys.
   */
  prefix?: string;
  /**
   * If `true`, preserve the original casing of environment variable keys.
   * @defaultValue `false` (keys are lowercased)
   */
  caseSensitive?: boolean;
}

/**
 * Source that reads from `process.env`.
 *
 * By default all keys are lowercased. Use `prefix` to narrow the set of
 * variables and `caseSensitive` to preserve original key casing.
 *
 * @example
 * ```typescript
 * EnvironmentSource()                           // all env vars
 * EnvironmentSource({ prefix: "APP_" })         // only APP_* vars, prefix stripped
 * EnvironmentSource({ caseSensitive: true })    // preserve key casing
 * ```
 */
export function EnvironmentSource(options?: EnvironmentSourceOptions): Source {
  const caseSensitive = options?.caseSensitive ?? false;
  const prefix = caseSensitive ? options?.prefix : options?.prefix?.toLowerCase();

  return {
    name: "environment",
    async load() {
      const result: Record<string, string> = {};

      for (const [key, value] of Object.entries(process.env)) {
        if (value === undefined) continue;

        const normalized = caseSensitive ? key : key.toLowerCase();

        if (prefix) {
          if (!normalized.startsWith(prefix)) continue;

          result[normalized.slice(prefix.length)] = value;
        } else {
          result[normalized] = value;
        }
      }

      return result;
    },
  };
}
