"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cancelBookingAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId);
      if (!result.ok) {
        setError(result.error);
      }
      setConfirming(false);
      router.replace(`/bookings/${bookingId}`);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="destructive" onClick={() => setConfirming(true)}>
          Cancel booking
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="destructive" onClick={cancel} disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : null}
        Yes, cancel it
      </Button>
      <Button variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
        Keep it
      </Button>
    </div>
  );
}
