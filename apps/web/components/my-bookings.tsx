"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, CircleAlert, Loader2, Search } from "lucide-react";
import { loadBookingsAction } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay, formatTimeRange } from "@/lib/format";
import type { Booking, Slot } from "@/lib/types";

export function MyBookings({ initialEmail, slotsById }: { initialEmail: string; slotsById: Record<string, Slot> }) {
  const [email, setEmail] = useState(initialEmail);
  const [searchedEmail, setSearchedEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const loadedInitial = useRef(false);

  function load(targetEmail: string, cursor: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await loadBookingsAction(targetEmail, cursor);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSearchedEmail(targetEmail);
      setBookings((current) => (cursor ? [...current, ...result.page.bookings] : result.page.bookings));
      setNextCursor(result.page.next_cursor);
    });
  }

  useEffect(() => {
    if (initialEmail && !loadedInitial.current) {
      loadedInitial.current = true;
      load(initialEmail, null);
    }
  }, [initialEmail]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }
    load(trimmed, null);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="lookup-email">Email</Label>
          <Input
            id="lookup-email"
            type="email"
            autoComplete="email"
            placeholder="ada@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending && bookings.length === 0 ? <Loader2 className="animate-spin" /> : <Search />}
          Find bookings
        </Button>
      </form>

      {error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {searchedEmail !== null && bookings.length === 0 && !error ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No bookings found for {searchedEmail}.
          </CardContent>
        </Card>
      ) : null}

      {bookings.length > 0 ? (
        <ul className="space-y-3">
          {bookings.map((booking) => {
            const slot = slotsById[booking.slot_id];
            return (
              <li key={booking.id}>
                <Link
                  href={`/bookings/${booking.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs transition hover:border-primary/60 hover:bg-accent/40"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">
                      {slot ? `${formatDay(slot.start)}, ${formatTimeRange(slot.start, slot.end)}` : `Slot ${booking.slot_id}`}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {slot?.provider ?? "Doctor unavailable"} · {booking.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={booking.status === "confirmed" ? "success" : "destructive"} className="capitalize">
                      {booking.status}
                    </Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {nextCursor && searchedEmail ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(searchedEmail, nextCursor)} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
