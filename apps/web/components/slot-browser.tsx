"use client";

import { useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dayKey, formatDay, formatTimeRange } from "@/lib/format";
import type { Slot } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_PROVIDERS = "all";

export function SlotBrowser({ slots }: { slots: Slot[] }) {
  const [provider, setProvider] = useState<string>(ALL_PROVIDERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const selectedSlot = slots.find((slot) => slot.id === selectedId && slot.available) ?? null;
  const availableCount = visibleSlots.filter((slot) => slot.available).length;

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {daySlots.map((slot) => {
                const isSelected = slot.id === selectedSlot?.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedId(slot.id)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left shadow-xs transition",
                      "hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 disabled:hover:border-border",
                      isSelected && "border-primary bg-accent ring-[3px] ring-ring/30",
                    )}
                  >
                    <span>
                      <span className="block font-medium tabular-nums">{formatTimeRange(slot.start, slot.end)}</span>
                      <span className="block text-sm text-muted-foreground">{slot.provider}</span>
                    </span>
                    {slot.available ? (
                      <Badge variant="success">Open</Badge>
                    ) : (
                      <Badge variant="secondary">Booked</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="lg:sticky lg:top-6">
        {selectedSlot ? (
          <BookingForm key={selectedSlot.id} slot={selectedSlot} onCancel={() => setSelectedId(null)} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your appointment</CardTitle>
              <CardDescription>Select an open time to continue.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
