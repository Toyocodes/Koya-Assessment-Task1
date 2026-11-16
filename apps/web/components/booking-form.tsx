"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleAlert, Loader2, UserRound } from "lucide-react";
import { bookSlotAction } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay, formatTimeRange } from "@/lib/format";
import type { Slot } from "@/lib/types";

export function BookingForm({ slot, onCancel }: { slot: Slot; onCancel: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const attempt = useRef<{ signature: string; key: string } | null>(null);

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
        router.push(`/bookings/${result.bookingId}?new=1`);
        return;
      }
      setError(result.error);
      if (result.status === 409 || result.status === 404) {
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm your appointment</CardTitle>
        <CardDescription>Enter your details to book this time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
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

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {isPending ? "Booking…" : "Book appointment"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Back
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
