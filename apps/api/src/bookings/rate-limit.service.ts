import { Injectable } from "@nestjs/common";
import { errorResult, type ApiResult } from "../lib/api-result";
import { advisoryLock, type Tx } from "../lib/locks";

const MAX_ATTEMPTS_PER_WINDOW = 5;
const RATE_WINDOW_MS = 60_000;

@Injectable()
export class RateLimitService {
  async consume(tx: Tx, email: string): Promise<ApiResult | null> {
    await advisoryLock(tx, `booking-attempts:${email}`);

    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_WINDOW_MS);

    await tx.bookingAttempt.deleteMany({ where: { email, createdAt: { lte: windowStart } } });

    const recent = await tx.bookingAttempt.findMany({
      where: { email, createdAt: { gt: windowStart } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
      take: MAX_ATTEMPTS_PER_WINDOW,
    });

    if (recent.length >= MAX_ATTEMPTS_PER_WINDOW) {
      const oldest = recent[0]!.createdAt.getTime();
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now.getTime()) / 1000));
      return errorResult(429, "too many booking attempts for this email, try again later", {
        "Retry-After": String(retryAfterSeconds),
      });
    }

    await tx.bookingAttempt.create({ data: { email, createdAt: now } });
    return null;
  }
}
