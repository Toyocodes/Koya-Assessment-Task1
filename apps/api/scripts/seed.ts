const PROVIDERS = ["Dr Ade", "Dr Bello", "Dr Chioma"];
const DAYS = 14;
const FIRST_HOUR_UTC = 9;
const SLOTS_PER_DAY = 8;
const SLOT_MINUTES = 30;

function buildSlots() {
  const slots: { id: string; provider: string; start: string; end: string }[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let day = 1; day <= DAYS; day += 1) {
    const date = new Date(today.getTime() + day * 86_400_000);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
      continue;
    }
    for (const [providerIndex, provider] of PROVIDERS.entries()) {
      for (let index = 0; index < SLOTS_PER_DAY; index += 1) {
        const start = new Date(date.getTime() + (FIRST_HOUR_UTC * 60 + index * SLOT_MINUTES) * 60_000);
        const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
        const stamp = start.toISOString().slice(0, 16).replace(/[-:T]/g, "");
        slots.push({ id: `p${providerIndex + 1}-${stamp}`, provider, start: start.toISOString(), end: end.toISOString() });
      }
    }
  }
  return slots;
}

async function main() {
  const baseUrl = process.env.SEED_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is required");
  }

  const slots = buildSlots();
  const response = await fetch(`${baseUrl}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ slots }),
  });

  console.log(response.status, await response.text());
  if (!response.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
