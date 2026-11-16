"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarClock, CircleAlert, Loader2, UserRound } from "lucide-react";
import { bookSlotAction } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay, formatTimeRange } from "@/lib/format";
import type { Slot } from "@/lib/types";

type BookingFormProps = {
  slot: Slot;
  onPendingChange: (pending: boolean) => void;
  onBooked: (bookingId: string) => void;
  onUnavailable: (message: string) => void;
  onCancel: () => void;
};

export function BookingForm({ slot, onPendingChange, onBooked, onUnavailable, onCancel }: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    onPendingChange(isPending);
  }, [isPending, onPendingChange]);

  function idempotencyKeyFor(signature: string): string {
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, key: crypto.randomUUID() };
    }
    return attempt.current.key;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError("Please enter your name and email.");
      return;
    }

    const idempotencyKey = idempotencyKeyFor(JSON.stringify([slot.id, trimmedName, trimmedEmail.toLowerCase()]));

    startTransition(async () => {
      const result = await bookSlotAction({ slotId: slot.id, name: trimmedName, email: trimmedEmail, idempotencyKey });
      if (result.ok) {
        onBooked(result.bookingId);
        return;
      }
      if (result.status === 409 || result.status === 404) {
        onUnavailable(result.error);
        return;
      }
      setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-lg bg-accent/60 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <UserRound className="size-4 text-primary" />
          {slot.provider}
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="size-4 text-primary" />
          {formatDay(slot.start)}, {formatTimeRange(slot.start, slot.end)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ada Obi"
            disabled={isPending}
            autoFocus
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ada@example.com"
            disabled={isPending}
            required
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {isPending ? "Booking…" : "Book appointment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
