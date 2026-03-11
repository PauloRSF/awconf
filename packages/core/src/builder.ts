/**
 * A function that converts a raw config value into the desired type.
 *
 * Throw an `Error` if the value cannot be parsed. Return a default when
 * `raw` is `undefined` to make the key optional.
 *
 * @example
 * ```typescript
 * const asPort: ValueParser<number> = (raw) => {
 *   if (raw === undefined) return 3000;
 *   const n = Number(raw);
 *   if (Number.isNaN(n)) throw new Error("expected a number");
 *   return n;
 * };
 * ```
 */
export type ValueParser<T> = (raw: unknown) => T;

/**
 * A built config schema that can resolve a typed config object from merged
 * key-value pairs. Created by {@link configBuilder}.
 */
export interface ConfigBuilder<T> {
  /**
   * Validate and parse the merged values into the final config object.
   * Throws {@link ConfigError} when one or more keys fail validation.
   */
  resolve(values: Record<string, unknown>): T;
}

/**
 * Context passed to the {@link configBuilder} callback. Use `get` to declare
 * each config key and its parser.
 */
export interface BuilderContext {
  /**
   * Declare a config key with a parser.
   * @param key   - The config key name (case-insensitive).
   * @param parser - A {@link ValueParser} that converts the raw value.
   */
  get<T>(key: string, parser: ValueParser<T>): T;
}

/**
 * Creates a {@link ConfigBuilder} using plain parser functions.
 *
 * The callback receives a {@link BuilderContext} whose `get` method declares
 * each key and its parser. All validation errors are collected and thrown
 * together as a single {@link ConfigError}.
 *
 * @example
 * ```typescript
 * const builder = configBuilder((c) => ({
 *   port: c.get("port", (raw) => Number(raw)),
 *   host: c.get("host", (raw) => String(raw)),
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
        get<V>(key: string, parser: ValueParser<V>): V {
          const raw = values[key.toLowerCase()];

          if (raw === undefined) {
            try {
              return parser(undefined);
            } catch {
              errors.push(new ConfigMissingKeyError(key));
              return undefined as V;
            }
          }

          try {
            return parser(raw);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : String(err);
            errors.push(new ConfigKeyParseError(key, message));
            return undefined as V;
          }
        },
      };

      const result = fn(ctx);

      if (errors.length > 0) throw new ConfigError(errors);

      return result;
    },
  };
}

/**
 * Union of all possible per-key config errors.
 */
export type ConfigKeyError = ConfigMissingKeyError | ConfigKeyParseError;

/**
 * Aggregate error thrown when config resolution fails. Contains all individual
 * per-key errors so every problem can be reported at once.
 */
export class ConfigError extends Error {
  constructor(public readonly errors: readonly ConfigKeyError[]) {
    const summary = errors.map((e) => `  - ${e.message}`).join("\n");
    super(
      `Config validation failed with ${errors.length} error(s):\n${summary}`,
    );
    this.name = "ConfigError";
  }
}

/**
 * Thrown when a required config key is not present in any source and the
 * parser does not provide a default.
 */
export class ConfigMissingKeyError extends Error {
  constructor(public readonly key: string) {
    super(`Missing required config key: "${key}"`);
    this.name = "ConfigMissingKeyError";
  }
}

/**
 * Thrown when a config key is present but fails validation or parsing.
 * The {@link reason} field contains the parser error message.
 */
export class ConfigKeyParseError extends Error {
  constructor(
    public readonly key: string,
    public readonly reason: string,
  ) {
    super(`Cannot parse config key "${key}": ${reason}`);
    this.name = "ConfigKeyParseError";
  }
}
