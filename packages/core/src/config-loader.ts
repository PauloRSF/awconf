import type { Source } from "./source.js";
import type { ConfigBuilder } from "./builder.js";
import type { SourceContext } from "./shared/SourceContext.js";
import { SourceLoadError } from "./errors.js";

/**
 * Controls how duplicate keys from multiple sources are resolved.
 *
 * - `"last-wins"` — later sources override earlier ones (typical for
 *   env-var overrides).
 * - `"first-wins"` — the first value found is kept (typical for
 *   priority-ordered sources).
 */
export type MergeStrategy = "last-wins" | "first-wins";

/**
 * Options for {@link resolveConfig}.
 */
export interface ConfigLoaderOptions<T> {
  /** Ordered list of sources to load values from. */
  sources: Source[];
  /** Strategy for resolving duplicate keys across sources. */
  mergeStrategy: MergeStrategy;
  /**
   * Builder that defines the config schema and validates merged values.
   * Create one with `configBuilder` from `@awconf/core` or `@awconf/zod`.
   */
  builder: ConfigBuilder<T>;
  /** Optional logger forwarded to every source's `load` call. */
  logger?: SourceContext["logger"];
}

/**
 * Load, merge, and validate configuration from multiple sources.
 *
 * Sources are loaded in order, their key-value pairs merged according to
 * `mergeStrategy`, and the resulting map validated through the `builder`.
 *
 * @throws {ConfigError} When one or more config keys fail validation.
 *
 * @example
 * ```typescript
 * const config = await resolveConfig({
 *   mergeStrategy: "last-wins",
 *   sources: [EnvironmentFileSource(), EnvironmentSource()],
 *   builder: configBuilder((c) => ({
 *     port: c.get("port", (raw) => Number(raw)),
 *   })),
 * });
 * ```
 */
export async function resolveConfig<T>(options: ConfigLoaderOptions<T>): Promise<T> {
  const merged: Record<string, unknown> = {};
  const firstWins = options.mergeStrategy === "first-wins";

  for (const source of options.sources) {
    let values: Record<string, unknown>;

    try {
      values = await source.load({ logger: options.logger });
    } catch (err) {
      throw new SourceLoadError(source.name, err);
    }

    for (const [key, value] of Object.entries(values)) {
      const lower = key.toLowerCase();

      if (firstWins && lower in merged) continue;

      merged[lower] = value;
    }
  }

  return options.builder.resolve(merged);
}
