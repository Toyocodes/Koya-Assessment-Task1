"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2, Frown } from "lucide-react";
import { toast } from "sonner";
import { BookingForm } from "@/components/booking-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayKey, formatDay, formatTimeRange } from "@/lib/format";
import type { Slot } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_PROVIDERS = "all";

export function SlotBrowser({ slots }: { slots: Slot[] }) {
  const router = useRouter();
  const [provider, setProvider] = useState<string>(ALL_PROVIDERS);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  const providers = useMemo(() => Array.from(new Set(slots.map((slot) => slot.provider))).sort(), [slots]);

  const visibleSlots = useMemo(
    () => (provider === ALL_PROVIDERS ? slots : slots.filter((slot) => slot.provider === provider)),
    [slots, provider],
  );

  const days = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of visibleSlots) {
      const key = dayKey(slot.start);
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return Array.from(groups.entries());
  }, [visibleSlots]);

  const availableCount = visibleSlots.filter((slot) => slot.available).length;

  function closeBookingDialog(open: boolean) {
    if (!open && !isBooking) {
      setSelectedSlot(null);
    }
  }

  function handleBooked(bookingId: string) {
    setSelectedSlot(null);
    toast.success("Booking successful", { description: "Your appointment is confirmed." });
    router.push(`/bookings/${bookingId}`);
  }

  function handleUnavailable(message: string) {
    setSelectedSlot(null);
    setUnavailableMessage(message);
    router.refresh();
  }

  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarX2 className="size-10 text-muted-foreground" />
          <p className="font-medium">No upcoming appointment slots</p>
          <p className="text-sm text-muted-foreground">Please check back later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[ALL_PROVIDERS, ...providers].map((value) => (
          <Button
            key={value}
            size="sm"
            variant={provider === value ? "default" : "outline"}
            onClick={() => setProvider(value)}
          >
            {value === ALL_PROVIDERS ? "All doctors" : value}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          {availableCount} available {availableCount === 1 ? "slot" : "slots"}
        </span>
      </div>

      {days.map(([key, daySlots]) => (
        <section key={key} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {formatDay(daySlots[0]!.start)}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {daySlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left shadow-xs transition",
                  "hover:border-primary/60 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 disabled:hover:border-border",
                )}
              >
                <span>
                  <span className="block font-medium tabular-nums">{formatTimeRange(slot.start, slot.end)}</span>
                  <span className="block text-sm text-muted-foreground">{slot.provider}</span>
                </span>
                {slot.available ? <Badge variant="success">Open</Badge> : <Badge variant="secondary">Booked</Badge>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <Dialog open={selectedSlot !== null} onOpenChange={closeBookingDialog}>
        <DialogContent
          showCloseButton={!isBooking}
          onInteractOutside={(event) => isBooking && event.preventDefault()}
          onEscapeKeyDown={(event) => isBooking && event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Book your appointment</DialogTitle>
            <DialogDescription>Enter your details to confirm this time.</DialogDescription>
          </DialogHeader>
          {selectedSlot ? (
            <BookingForm
              key={selectedSlot.id}
              slot={selectedSlot}
              onPendingChange={setIsBooking}
              onBooked={handleBooked}
              onUnavailable={handleUnavailable}
              onCancel={() => setSelectedSlot(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={unavailableMessage !== null} onOpenChange={(open) => !open && setUnavailableMessage(null)}>
        <DialogContent className="sm:max-w-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-primary">
            <Frown className="size-6" />
          </div>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle>Oops! This slot is no longer available</DialogTitle>
            <DialogDescription>{unavailableMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setUnavailableMessage(null)}>Choose another time</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
