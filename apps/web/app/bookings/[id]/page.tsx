import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { ServiceError } from "@/components/service-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchBooking, fetchSlots } from "@/lib/api";
import { formatDateTime, formatDay, formatTimeRange } from "@/lib/format";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-all text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;

  const [bookingResponse, slotsResponse] = await Promise.all([fetchBooking(id), fetchSlots()]);

  if (!bookingResponse.ok) {
    if (bookingResponse.status === 404) {
      notFound();
    }
    return <ServiceError message={bookingResponse.error} />;
  }

  const booking = bookingResponse.data;
  const slot = slotsResponse.ok ? slotsResponse.data.slots.find((item) => item.id === booking.slot_id) : undefined;
  const isConfirmed = booking.status === "confirmed";
  const slotHasStarted = slot ? new Date(slot.start).getTime() <= Date.now() : false;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {isNew && isConfirmed ? (
        <Alert variant="success">
          <CircleCheck />
          <AlertTitle>You&apos;re booked!</AlertTitle>
          <AlertDescription>Your appointment is confirmed. Keep your booking reference handy.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-xl">Booking details</CardTitle>
              <CardDescription>Reference {booking.id}</CardDescription>
            </div>
            <Badge variant={isConfirmed ? "success" : "destructive"} className="capitalize">
              {booking.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <Detail label="Doctor" value={slot?.provider ?? "Unavailable"} />
            <Detail label="Date" value={slot ? formatDay(slot.start) : "Unavailable"} />
            <Detail label="Time" value={slot ? `${formatTimeRange(slot.start, slot.end)} WAT` : "Unavailable"} />
            <Detail label="Name" value={booking.name} />
            <Detail label="Email" value={booking.email} />
            <Detail label="Booked at" value={`${formatDateTime(booking.created_at)} WAT`} />
          </dl>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          {isConfirmed && !slotHasStarted ? <CancelBookingButton bookingId={booking.id} /> : null}
          <Button asChild variant="outline">
            <Link href={`/my-bookings?email=${encodeURIComponent(booking.email)}`}>All my bookings</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Book another</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
