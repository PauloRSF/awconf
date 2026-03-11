import { SourceContext } from "./shared/SourceContext.js";

/**
 * A configuration source that loads key-value pairs from an external store.
 *
 * Implement this interface to create custom sources (e.g. Vault, AWS Parameter
 * Store, database). Built-in implementations include {@link EnvironmentSource},
 * {@link EnvironmentFileSource}, and {@link JsonFileSource}.
 *
 * @example
 * ```typescript
 * const MySource: Source = {
 *   name: "my-source",
 *   async load(ctx) {
 *     ctx.logger?.debug("Loading my config");
 *     return { key: "value" };
 *   },
 * };
 * ```
 */
export interface Source {
  /** Human-readable name shown in error messages and log output. */
  readonly name: string;

  /**
   * Loads configuration values from the source.
   * @returns Flat record of key-value pairs. Keys are normalised to lowercase
   * during merging.
   */
  load(context: SourceContext): Promise<Record<string, unknown>>;
}
