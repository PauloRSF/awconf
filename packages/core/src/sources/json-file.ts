import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Source } from "../source.js";
import { flattenObject, isFileNotFoundError } from "../shared/helpers.js";

/**
 * Options for {@link JsonFileSource}.
 */
export interface JsonFileSourceOptions {
  /** Path to the JSON file. */
  file: string;
  /**
   * When `true`, silently return an empty record if the file does not exist
   * instead of throwing.
   * @defaultValue `false`
   */
  optional?: boolean;
}

/**
 * Source that reads a JSON file and flattens nested objects into dot-separated
 * keys (e.g. `{ db: { host: "localhost" } }` becomes `{ "db.host": "localhost" }`).
 *
 * The root value must be a JSON object. Keys are lowercased.
 *
 * @example
 * ```typescript
 * JsonFileSource({ file: "config.json" })
 * JsonFileSource({ file: "secrets.json", optional: true })
 * ```
 */
export function JsonFileSource(options: JsonFileSourceOptions): Source {
  return {
    name: `json-file(${options.file})`,
    async load({ logger }) {
      const absolute = resolve(options.file);
      let content: string;

      try {
        content = await readFile(absolute, "utf-8");
      } catch (err: unknown) {
        if (options.optional && isFileNotFoundError(err)) {
          logger?.debug({ path: absolute }, "JSON file not found, skipping");

          return {};
        }
        throw new Error(`Failed to read JSON file "${absolute}": ${err}`);
      }

      const parsed: unknown = JSON.parse(content);

      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error(
          `JSON file "${absolute}" must contain an object at the root`,
        );
      }

      return flattenObject(parsed as Record<string, unknown>);
    },
  };
}
