type BookingCursor = {
  createdAt: Date;
  id: string;
};

export function encodeCursor(cursor: BookingCursor): string {
  return Buffer.from(JSON.stringify([cursor.createdAt.toISOString(), cursor.id])).toString("base64url");
}

export function decodeCursor(raw: string): BookingCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      return null;
    }
    const [createdAtRaw, id] = parsed;
    if (typeof createdAtRaw !== "string" || typeof id !== "string") {
      return null;
    }
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }
    return { createdAt, id };
  } catch {
    return null;
  }
}
