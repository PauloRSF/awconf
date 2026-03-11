/**
 * Thrown when a source's `load` method fails. Wraps the original error and
 * includes the source name so callers can identify which source caused the
 * failure when multiple sources are configured.
 */
export class SourceLoadError extends Error {
  constructor(
    public readonly sourceName: string,
    public readonly cause: unknown,
  ) {
    const reason =
      cause instanceof Error ? cause.message : String(cause);
    super(`Source "${sourceName}" failed to load: ${reason}`);
    this.name = "SourceLoadError";
  }
}
