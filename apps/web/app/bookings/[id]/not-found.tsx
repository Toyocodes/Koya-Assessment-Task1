import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BookingNotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="space-y-4 py-6 text-center">
        <p className="text-lg font-semibold">Booking not found</p>
        <p className="text-sm text-muted-foreground">Check the reference and try again.</p>
        <Button asChild>
          <Link href="/my-bookings">Find my bookings</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
