import type { Prisma } from "@prisma/client";

export type Tx = Prisma.TransactionClient;

export async function advisoryLock(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}::text, 0))`;
}
