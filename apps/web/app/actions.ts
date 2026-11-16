"use server";

import { revalidatePath } from "next/cache";
import { cancelBooking, createBooking, fetchBookingsByEmail } from "@/lib/api";
import type { ApiResponse, Booking, BookingPage } from "@/lib/types";

function friendlyBookingError(response: Extract<ApiResponse<Booking>, { ok: false }>): string {
  switch (response.status) {
    case 409:
      return "Someone has just booked this slot. Please choose another time.";
    case 404:
      return "This slot no longer exists. Please refresh and choose another time.";
    case 429:
      return `Too many booking attempts for this email. Please try again in ${response.retryAfter ?? 60} seconds.`;
    default:
      return response.error.charAt(0).toUpperCase() + response.error.slice(1);
  }
}

export async function bookSlotAction(input: {
  slotId: string;
  name: string;
  email: string;
  idempotencyKey: string;
}): Promise<{ ok: true; bookingId: string } | { ok: false; error: string; status: number }> {
  const response = await createBooking(
    { slot_id: input.slotId, name: input.name, email: input.email },
    input.idempotencyKey,
  );
  revalidatePath("/");
  if (!response.ok) {
    return { ok: false, status: response.status, error: friendlyBookingError(response) };
  }
  return { ok: true, bookingId: response.data.id };
}

export async function cancelBookingAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await cancelBooking(id);
  revalidatePath("/");
  revalidatePath(`/bookings/${id}`);
  if (!response.ok) {
    return {
      ok: false,
      error: response.status === 409 ? "This booking has already been cancelled." : response.error,
    };
  }
  return { ok: true };
}

export async function loadBookingsAction(
  email: string,
  cursor: string | null,
): Promise<{ ok: true; page: BookingPage } | { ok: false; error: string }> {
  const response = await fetchBookingsByEmail(email, cursor);
  if (!response.ok) {
    return { ok: false, error: response.error.charAt(0).toUpperCase() + response.error.slice(1) };
  }
  return { ok: true, page: response.data };
}
