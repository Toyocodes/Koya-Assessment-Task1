import "server-only";
import type { ApiResponse, Booking, BookingPage, Slot } from "./types";

function config() {
  const baseUrl = process.env.API_URL;
  const apiKey = process.env.API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("API_URL and API_KEY must be set");
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const { baseUrl, apiKey } = config();
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", apiKey);
  headers.set("Accept", "application/json");
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    return { ok: false, status: 503, error: "The booking service is unreachable. Please try again shortly." };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (response.ok) {
    return { ok: true, status: response.status, data: payload as T };
  }

  const message =
    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `Request failed with status ${response.status}`;
  const retryAfterHeader = response.headers.get("Retry-After");

  return {
    ok: false,
    status: response.status,
    error: message,
    retryAfter: retryAfterHeader ? Number(retryAfterHeader) : undefined,
  };
}

export function fetchSlots(provider?: string) {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  return request<{ slots: Slot[] }>(`/slots${query}`);
}

export function fetchBooking(id: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(id)}`);
}

export function fetchBookingsByEmail(email: string, cursor?: string | null, limit = 10) {
  const params = new URLSearchParams({ email, limit: String(limit) });
  if (cursor) {
    params.set("cursor", cursor);
  }
  return request<BookingPage>(`/bookings?${params.toString()}`);
}

export function createBooking(input: { slot_id: string; name: string; email: string }, idempotencyKey: string) {
  return request<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export function cancelBooking(id: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(id)}`, { method: "DELETE" });
}
