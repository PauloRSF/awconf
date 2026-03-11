export const string = (raw: unknown): string => {
  if (raw === undefined || typeof raw !== "string") throw new Error("expected a string");
  return raw;
};

export const number = (raw: unknown): number => {
  const n = Number(raw);
  if (raw === undefined || Number.isNaN(n)) throw new Error("expected a number");
  return n;
};

export const boolean = (raw: unknown): boolean => {
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new Error("expected a boolean (true/false or 1/0)");
};

export const oneOf = <T extends string>(...allowed: T[]) =>
  (raw: unknown): T => {
    if (!allowed.includes(raw as T))
      throw new Error(`expected one of: ${allowed.join(", ")}`);
    return raw as T;
  };

export const withDefault = <T>(parser: (raw: unknown) => T, fallback: T) =>
  (raw: unknown): T => (raw === undefined ? fallback : parser(raw));

export const csvList = (raw: unknown): string[] => {
  if (typeof raw !== "string") throw new Error("expected a comma-separated string");
  return raw.split(",").map((v) => v.trim());
};
