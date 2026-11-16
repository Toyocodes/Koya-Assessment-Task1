import { timingSafeEqual } from "node:crypto";

export function isValidApiKey(provided: unknown, expected: string): boolean {
  if (typeof provided !== "string" || provided === "") {
    return false;
  }
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}
