import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
        return sorted;
      }, {});
  }
  return value;
}

export function hashRequestBody(body: unknown): string {
  const serialized = body === undefined ? "undefined" : JSON.stringify(canonicalize(body));
  return createHash("sha256").update(serialized).digest("hex");
}
