export function isFileNotFoundError(err: unknown): boolean {
  return err instanceof Error && "code" in err && err.code === "ENOENT";
}

export function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else if (value !== null && value !== undefined) {
      result[fullKey.toLowerCase()] = value;
    }
  }

  return result;
}
