const BASE_URL = (process.env.CHECK_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/+$/, "");
const API_KEY = process.env.API_KEY ?? "";

type Result = { status: number; body: any; headers: Headers };

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}`, detail === undefined ? "" : JSON.stringify(detail));
  }
}

async function call(method: string, path: string, options: { body?: unknown; headers?: Record<string, string>; key?: string | null } = {}): Promise<Result> {
  const headers: Record<string, string> = { ...options.headers };
  const key = options.key === undefined ? API_KEY : options.key;
  if (key !== null) {
    headers["X-API-Key"] = key;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : typeof options.body === "string" ? options.body : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body, headers: response.headers };
}

function isoFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function slot(id: string, provider: string, startMinutes: number) {
  return { id, provider, start: isoFromNow(startMinutes), end: isoFromNow(startMinutes + 30) };
}

async function reset() {
  const slots = [
    slot("s3", "Dr Bello", 300),
    slot("s1", "Dr Ade", 100),
    slot("s2", "Dr Ade", 200),
    slot("past", "Dr Ade", -120),
    ...Array.from({ length: 12 }, (_, index) => slot(`p${index + 1}`, "Dr Chioma", 1000 + index * 30)),
  ];
  return call("POST", "/reset", { body: { slots } });
}

async function level1And2() {
  console.log("\nLevel 1 and 2");

  check("missing key returns 401", (await call("GET", "/slots", { key: null })).status === 401);
  check("wrong key returns 401", (await call("GET", "/slots", { key: "wrong" })).status === 401);
  const unauthorizedReset = await call("POST", "/reset", { key: null, body: { slots: [] } });
  check("reset without key returns 401 with error body", unauthorizedReset.status === 401 && typeof unauthorizedReset.body?.error === "string");

  const resetResponse = await reset();
  check("reset returns 200", resetResponse.status === 200, resetResponse.body);

  const slots = await call("GET", "/slots");
  const ids = slots.body?.slots?.map((item: any) => item.id) ?? [];
  check("slots sorted by start", ids[0] === "past" && ids[1] === "s1" && ids[2] === "s2" && ids[3] === "s3", ids.slice(0, 4));
  check("slots have available true", slots.body?.slots?.every((item: any) => item.available === true));

  const filtered = await call("GET", "/slots?provider=Dr%20Ade");
  check("provider filter exact match", filtered.body?.slots?.length === 3 && filtered.body.slots.every((item: any) => item.provider === "Dr Ade"));
  check("provider filter partial gives none", (await call("GET", "/slots?provider=Ade")).body?.slots?.length === 0);

  const created = await call("POST", "/bookings", { body: { slot_id: "s1", name: "  Ada Obi  ", email: "  ADA@Example.com " } });
  check("booking returns 201 confirmed", created.status === 201 && created.body?.status === "confirmed", created.body);
  check("name and email normalised", created.body?.name === "Ada Obi" && created.body?.email === "ada@example.com", created.body);
  check("booking has id, slot_id and created_at", typeof created.body?.id === "string" && created.body?.slot_id === "s1" && !Number.isNaN(Date.parse(created.body?.created_at)));

  const fetched = await call("GET", `/bookings/${created.body?.id}`);
  check("get booking returns 200 with same booking", fetched.status === 200 && fetched.body?.id === created.body?.id);
  check("unknown booking returns 404", (await call("GET", "/bookings/does-not-exist")).status === 404);

  const invalidCases: [string, unknown][] = [
    ["missing slot_id", { name: "A", email: "a1@example.com" }],
    ["missing name", { slot_id: "s2", email: "a2@example.com" }],
    ["empty name", { slot_id: "s2", name: "   ", email: "a3@example.com" }],
    ["missing email", { slot_id: "s2", name: "A" }],
    ["invalid email", { slot_id: "s2", name: "A", email: "not-an-email" }],
    ["numeric name", { slot_id: "s2", name: 42, email: "a4@example.com" }],
  ];
  for (const [label, body] of invalidCases) {
    const response = await call("POST", "/bookings", { body });
    check(`${label} returns 400`, response.status === 400 && typeof response.body?.error === "string", response.body);
  }
  check("malformed JSON returns 400", (await call("POST", "/bookings", { body: "{bad json" })).status === 400);
  check("unknown slot returns 404", (await call("POST", "/bookings", { body: { slot_id: "nope", name: "A", email: "a5@example.com" } })).status === 404);
  check("started slot returns 400", (await call("POST", "/bookings", { body: { slot_id: "past", name: "A", email: "a6@example.com" } })).status === 400);
}

async function level3() {
  console.log("\nLevel 3");

  const duplicate = await call("POST", "/bookings", { body: { slot_id: "s1", name: "Bee", email: "bee@example.com" } });
  check("booking a taken slot returns 409", duplicate.status === 409, duplicate.body);

  const slots = await call("GET", "/slots");
  check("booked slot shows available false", slots.body?.slots?.find((item: any) => item.id === "s1")?.available === false);

  const racers = await Promise.all(
    Array.from({ length: 25 }, (_, index) =>
      call("POST", "/bookings", { body: { slot_id: "s2", name: `Racer ${index}`, email: `racer${index}@example.com` } }),
    ),
  );
  const winners = racers.filter((response) => response.status === 201).length;
  const conflicts = racers.filter((response) => response.status === 409).length;
  check("25 concurrent bookings produce exactly one 201", winners === 1, { winners, conflicts, statuses: racers.map((response) => response.status) });
  check("the other 24 get 409", conflicts === 24);

  const target = await call("POST", "/bookings", { body: { slot_id: "s3", name: "Cee", email: "cee@example.com" } });
  const cancelled = await call("DELETE", `/bookings/${target.body?.id}`);
  check("cancel returns 200 with cancelled status", cancelled.status === 200 && cancelled.body?.status === "cancelled", cancelled.body);
  check("cancel again returns 409", (await call("DELETE", `/bookings/${target.body?.id}`)).status === 409);
  check("cancel unknown returns 404", (await call("DELETE", "/bookings/does-not-exist")).status === 404);

  const freed = await call("GET", "/slots");
  check("cancelled slot is available again", freed.body?.slots?.find((item: any) => item.id === "s3")?.available === true);
  const rebooked = await call("POST", "/bookings", { body: { slot_id: "s3", name: "Dee", email: "dee@example.com" } });
  check("cancelled slot can be rebooked", rebooked.status === 201);
  check("old booking still readable as cancelled", (await call("GET", `/bookings/${target.body?.id}`)).body?.status === "cancelled");
}

async function level4() {
  console.log("\nLevel 4");

  const body = { slot_id: "p1", name: "Eve", email: "eve@example.com" };
  const first = await call("POST", "/bookings", { body, headers: { "Idempotency-Key": "key-1" } });
  const second = await call("POST", "/bookings", { body, headers: { "Idempotency-Key": "key-1" } });
  check("first idempotent request returns 201", first.status === 201);
  check("retry returns same status and id", second.status === first.status && second.body?.id === first.body?.id, { first: first.body, second: second.body });

  const different = await call("POST", "/bookings", { body: { ...body, slot_id: "p2" }, headers: { "Idempotency-Key": "key-1" } });
  check("same key with different body returns 422", different.status === 422, different.body);

  const concurrentBody = { slot_id: "p3", name: "Fay", email: "fay@example.com" };
  const concurrent = await Promise.all(
    Array.from({ length: 10 }, () => call("POST", "/bookings", { body: concurrentBody, headers: { "Idempotency-Key": "key-2" } })),
  );
  const uniqueIds = new Set(concurrent.map((response) => response.body?.id));
  check("10 concurrent retries return one booking id, all 201", uniqueIds.size === 1 && concurrent.every((response) => response.status === 201), concurrent.map((response) => [response.status, response.body?.id]));
  const fayBookings = await call("GET", "/bookings?email=fay@example.com");
  check("only one booking stored for concurrent retries", fayBookings.body?.bookings?.length === 1);

  const failedFirst = await call("POST", "/bookings", { body: { slot_id: "nope", name: "Gus", email: "gus@example.com" }, headers: { "Idempotency-Key": "key-3" } });
  const failedRetry = await call("POST", "/bookings", { body: { slot_id: "nope", name: "Gus", email: "gus@example.com" }, headers: { "Idempotency-Key": "key-3" } });
  check("idempotent error responses replay too", failedFirst.status === 404 && failedRetry.status === 404);

  const pagedEmail = "Pager@Example.com";
  const created: string[] = [];
  for (const slotId of ["p4", "p5", "p6", "p7", "p8"]) {
    const response = await call("POST", "/bookings", { body: { slot_id: slotId, name: "Pager", email: pagedEmail } });
    created.push(response.body?.id);
  }

  const seen: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const query: string = `/bookings?email=${encodeURIComponent("PAGER@example.COM")}&limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const page = await call("GET", query);
    if (page.status !== 200) {
      check("page request succeeds", false, page.body);
      break;
    }
    seen.push(...page.body.bookings.map((booking: any) => booking.id));
    cursor = page.body.next_cursor;
    pages += 1;
  } while (cursor && pages < 10);
  check("pagination returns all bookings oldest first with no duplicates", JSON.stringify(seen) === JSON.stringify(created), { seen, created });
  check("pagination took 3 pages with null cursor at end", pages === 3 && cursor === null, { pages });

  const defaultPage = await call("GET", "/bookings?email=pager@example.com");
  check("default limit returns everything when under 10", defaultPage.body?.bookings?.length === 5 && defaultPage.body?.next_cursor === null);

  for (const limit of ["0", "51", "abc", "1.5", "-1"]) {
    check(`limit=${limit} returns 400`, (await call("GET", `/bookings?email=pager@example.com&limit=${limit}`)).status === 400);
  }
  check("limit=50 is accepted", (await call("GET", "/bookings?email=pager@example.com&limit=50")).status === 200);
  check("unknown email returns empty list", (await call("GET", "/bookings?email=nobody@example.com")).body?.bookings?.length === 0);
}

async function level5() {
  console.log("\nLevel 5");

  const email = "spammer@example.com";
  const statuses: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const response = await call("POST", "/bookings", { body: { slot_id: "nope", name: "Spam", email: index % 2 === 0 ? email : email.toUpperCase() } });
    statuses.push(response.status);
  }
  check("first 5 attempts are processed (failed ones count)", statuses.every((status) => status === 404), statuses);

  const sixth = await call("POST", "/bookings", { body: { slot_id: "p9", name: "Spam", email } });
  const retryAfter = sixth.headers.get("retry-after");
  check("6th attempt returns 429", sixth.status === 429, sixth.body);
  check("Retry-After is a whole number of seconds", retryAfter !== null && /^\d+$/.test(retryAfter) && Number(retryAfter) >= 1 && Number(retryAfter) <= 60, retryAfter);

  const other = await call("POST", "/bookings", { body: { slot_id: "p9", name: "Other", email: "other@example.com" } });
  check("other emails are not affected", other.status === 201, other.body);

  const burst = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      call("POST", "/bookings", { body: { slot_id: `nope-${index}`, name: "Burst", email: "burst@example.com" } }),
    ),
  );
  const limited = burst.filter((response) => response.status === 429).length;
  check("10 concurrent attempts: exactly 5 processed and 5 limited", limited === 5, burst.map((response) => response.status));
}

async function main() {
  if (!API_KEY) {
    throw new Error("API_KEY is required");
  }
  console.log(`Checking ${BASE_URL}`);
  await level1And2();
  await level3();
  await level4();
  await level5();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
