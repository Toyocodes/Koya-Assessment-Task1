import type { Booking, Slot } from "@prisma/client";

export type BookingResponse = {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
};

export type SlotResponse = {
  id: string;
  provider: string;
  start: string;
  end: string;
  available: boolean;
};

export function toBookingResponse(booking: Pick<Booking, "id" | "slotId" | "name" | "email" | "status" | "createdAt">): BookingResponse {
  return {
    id: booking.id,
    slot_id: booking.slotId,
    name: booking.name,
    email: booking.email,
    status: booking.status,
    created_at: booking.createdAt.toISOString(),
  };
}

export function toSlotResponse(slot: Slot, available: boolean): SlotResponse {
  return {
    id: slot.id,
    provider: slot.provider,
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    available,
  };
}
