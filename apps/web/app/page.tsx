import { ServiceError } from "@/components/service-error";
import { SlotBrowser } from "@/components/slot-browser";
import { fetchSlots } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const response = await fetchSlots();

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Book an appointment</h1>
        <p className="max-w-2xl text-muted-foreground">
          Choose a doctor and a time that suits you. Times are shown in West Africa Time (WAT).
        </p>
      </section>
      {response.ok ? (
        <SlotBrowser
          slots={response.data.slots.filter((slot) => new Date(slot.start).getTime() > Date.now())}
        />
      ) : (
        <ServiceError message={response.error} />
      )}
    </div>
  );
}
