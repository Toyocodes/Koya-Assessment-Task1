import { BadRequestException, Injectable } from "@nestjs/common";
import { toSlotResponse, type SlotResponse } from "../lib/serializers";
import type { ResetInput } from "../lib/validation";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(provider: unknown): Promise<{ slots: SlotResponse[] }> {
    if (provider !== undefined && typeof provider !== "string") {
      throw new BadRequestException("provider must be a single value");
    }

    const slots = await this.prisma.slot.findMany({
      where: provider === undefined ? {} : { provider },
      orderBy: [{ start: "asc" }, { id: "asc" }],
      include: { _count: { select: { bookings: { where: { status: "confirmed" } } } } },
    });

    return { slots: slots.map(({ _count, ...slot }) => toSlotResponse(slot, _count.bookings === 0)) };
  }

  async reset({ slots }: ResetInput): Promise<{ status: string; slots: number }> {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.booking.deleteMany();
        await tx.idempotencyRecord.deleteMany();
        await tx.bookingAttempt.deleteMany();
        await tx.slot.deleteMany();
        if (slots.length > 0) {
          await tx.slot.createMany({ data: slots });
        }
      },
      { maxWait: 15_000, timeout: 30_000 },
    );

    return { status: "ok", slots: slots.length };
  }
}
