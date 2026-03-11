import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parse } from "dotenv";

import type { Source } from "../source.js";
import { isFileNotFoundError } from "../shared/helpers.js";

/**
 * Options for {@link EnvironmentFileSource}.
 */
export interface EnvironmentFileSourceOptions {
  /**
   * Path to the `.env` file.
   * @defaultValue `".env"`
   */
  file?: string;
  /**
   * When `true`, silently return an empty record if the file does not exist
   * instead of throwing.
   * @defaultValue `false`
   */
  optional?: boolean;
}

/**
 * Source that reads key-value pairs from a `.env` file using the `dotenv`
 * parser. Keys are lowercased.
 *
 * @example
 * ```typescript
 * EnvironmentFileSource()                                  // reads .env
 * EnvironmentFileSource({ file: ".env.production" })       // custom path
 * EnvironmentFileSource({ file: ".env.local", optional: true })
 * ```
 */
export function EnvironmentFileSource(
  options?: EnvironmentFileSourceOptions,
): Source {
  const filePath = options?.file ?? ".env";
  const isOptional = options?.optional ?? false;

  return {
    name: `env-file(${filePath})`,
    async load({ logger }) {
      const absolute = resolve(filePath);

      logger?.debug({ path: absolute }, "Loading env file");

      let content: string;

      try {
        content = await readFile(absolute, "utf-8");
      } catch (err: unknown) {
        if (isOptional && isFileNotFoundError(err)) {
          logger?.debug({ path: absolute }, "Env file not found, skipping");

          return {};
        }

        throw new Error(`Failed to read env file "${absolute}": ${err}`);
      }

      const parsed = parse(content);
      const result: Record<string, string> = {};

      for (const [key, value] of Object.entries(parsed)) {
        result[key.toLowerCase()] = value;
      }

      return result;
    },
  };
}
