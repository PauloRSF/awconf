/**
 * Minimal logging interface compatible with pino, winston, console, and most
 * logging libraries. Pass any object that satisfies this shape to
 * {@link SourceContext.logger} for debug output from sources.
 */
export interface Logger {
  debug(msg: unknown, ...args: unknown[]): void;
  info(msg: unknown, ...args: unknown[]): void;
  warn(msg: unknown, ...args: unknown[]): void;
  error(msg: unknown, ...args: unknown[]): void;
}

/**
 * Context passed to each {@link Source.load} call. Provides an optional logger
 * for debugging source behaviour during config resolution.
 */
export interface SourceContext {
  logger?: Logger;
}
