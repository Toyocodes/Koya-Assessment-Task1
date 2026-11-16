import { MyBookings } from "@/components/my-bookings";
import { fetchSlots } from "@/lib/api";
import type { Slot } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const slotsResponse = await fetchSlots();
  const slotsById: Record<string, Slot> = slotsResponse.ok
    ? Object.fromEntries(slotsResponse.data.slots.map((slot) => [slot.id, slot]))
    : {};

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">My bookings</h1>
        <p className="text-muted-foreground">Enter the email you booked with to see all your appointments.</p>
      </section>
      <MyBookings initialEmail={email ?? ""} slotsById={slotsById} />
    </div>
  );
}
