import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { errorResult, type ApiResult } from "../lib/api-result";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { hashRequestBody } from "../lib/hash";
import { advisoryLock, type Tx } from "../lib/locks";
import { toBookingResponse, type BookingResponse } from "../lib/serializers";
import { firstIssue, newBookingSchema, normalizeEmail } from "../lib/validation";
import { PrismaService } from "../prisma/prisma.service";
import { RateLimitService } from "./rate-limit.service";

const TRANSACTION_OPTIONS = { maxWait: 15_000, timeout: 20_000 };
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

type ListBookingsQuery = {
  email: unknown;
  limit: unknown;
  cursor: unknown;
};

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function parseLimit(raw: unknown): number | null {
  if (raw === undefined) {
    return DEFAULT_PAGE_SIZE;
  }
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    return null;
  }
  const limit = Number(raw);
  return limit >= 1 && limit <= MAX_PAGE_SIZE ? limit : null;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async create(body: unknown, idempotencyKey: string | undefined): Promise<ApiResult> {
    if (idempotencyKey !== undefined && idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      return errorResult(400, `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`);
    }

    const requestHash = hashRequestBody(body);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (idempotencyKey) {
          await advisoryLock(tx, `idempotency:${idempotencyKey}`);
          const existing = await tx.idempotencyRecord.findUnique({ where: { key: idempotencyKey } });
          if (existing) {
            if (existing.requestHash !== requestHash) {
              return errorResult(422, "Idempotency-Key has already been used with a different request body");
            }
            return { status: existing.statusCode, body: existing.responseBody };
          }
        }

        const result = await this.attempt(tx, body);

        if (idempotencyKey && result.status !== 429) {
          await tx.idempotencyRecord.create({
            data: {
              key: idempotencyKey,
              requestHash,
              statusCode: result.status,
              responseBody: result.body as Prisma.InputJsonValue,
            },
          });
        }

        return result;
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return errorResult(409, "slot is already booked");
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<BookingResponse> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("booking not found");
    }
    return toBookingResponse(booking);
  }

  async cancel(id: string): Promise<BookingResponse> {
    const updated = await this.prisma.booking.updateMany({
      where: { id, status: "confirmed" },
      data: { status: "cancelled" },
    });
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("booking not found");
    }
    if (updated.count === 0) {
      throw new ConflictException("booking is already cancelled");
    }
    return toBookingResponse(booking);
  }

  async list(query: ListBookingsQuery): Promise<{ bookings: BookingResponse[]; next_cursor: string | null }> {
    const email = normalizeEmail(query.email);
    if (!email) {
      throw new BadRequestException("email is required");
    }

    const limit = parseLimit(query.limit);
    if (limit === null) {
      throw new BadRequestException(`limit must be an integer from 1 to ${MAX_PAGE_SIZE}`);
    }

    let cursorFilter: Prisma.BookingWhereInput = {};
    if (query.cursor !== undefined && query.cursor !== "") {
      const cursor = typeof query.cursor === "string" ? decodeCursor(query.cursor) : null;
      if (!cursor) {
        throw new BadRequestException("cursor is invalid");
      }
      cursorFilter = {
        OR: [{ createdAt: { gt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { gt: cursor.id } }],
      };
    }

    const rows = await this.prisma.booking.findMany({
      where: { email, ...cursorFilter },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor = rows.length > limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;

    return { bookings: page.map(toBookingResponse), next_cursor: nextCursor };
  }

  private async attempt(tx: Tx, body: unknown): Promise<ApiResult> {
    const rateLimitEmail =
      body !== null && typeof body === "object" ? normalizeEmail((body as Record<string, unknown>).email) : null;

    if (rateLimitEmail) {
      const limited = await this.rateLimit.consume(tx, rateLimitEmail);
      if (limited) {
        return limited;
      }
    }

    const parsed = newBookingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResult(400, firstIssue(parsed.error));
    }
    const { slot_id: slotId, name, email } = parsed.data;

    const slot = await tx.slot.findUnique({ where: { id: slotId } });
    if (!slot) {
      return errorResult(404, "slot not found");
    }
    if (slot.start.getTime() <= Date.now()) {
      return errorResult(400, "slot has already started");
    }

    const id = randomUUID();
    const inserted = await tx.$queryRaw<{ created_at: Date }[]>`
      INSERT INTO "bookings" ("id", "slot_id", "name", "email", "status")
      VALUES (${id}, ${slot.id}, ${name}, ${email}, 'confirmed')
      ON CONFLICT ("slot_id") WHERE "status" = 'confirmed' DO NOTHING
      RETURNING "created_at"
    `;

    const row = inserted[0];
    if (!row) {
      return errorResult(409, "slot is already booked");
    }

    return {
      status: 201,
      body: toBookingResponse({ id, slotId: slot.id, name, email, status: "confirmed", createdAt: row.created_at }),
    };
  }
}
