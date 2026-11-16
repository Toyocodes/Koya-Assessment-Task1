# Koya Clinic Booking

A booking API for a clinic and a web page that uses it. Patients can see available slots, book one, view the confirmation, cancel, and page through their bookings.

The API follows the contract in [docs/openapi.json](docs/openapi.json). It covers all five levels.

## Stack

| Part | Tech |
| --- | --- |
| API (`apps/api`) | Node.js, TypeScript, NestJS 11 (Express adapter), Zod, Prisma |
| Web (`apps/web`) | Next.js 15 (App Router, server actions), Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL on Supabase |
| Hosting | API on Render (`render.yaml`), web on Vercel |
| Keep-alive | GitHub Actions workflow pinging every 10 minutes |

npm workspaces put both apps in one repository.

## Endpoints

Every request needs the `X-API-Key` header. Every error response is `{"error": "<message>"}`.

| Method | Path | Level | Notes |
| --- | --- | --- | --- |
| POST | `/reset` | 1 | Replaces all slots and clears bookings, idempotency records and rate-limit history |
| GET | `/slots?provider=` | 1 | Earliest first, with `available` |
| POST | `/bookings` | 1–5 | 201 / 400 / 404 / 409 / 422 / 429 |
| GET | `/bookings/:id` | 1 | 200 / 404 |
| DELETE | `/bookings/:id` | 3 | 200 / 404 / 409 |
| GET | `/bookings?email=&limit=&cursor=` | 4 | Cursor pagination, oldest first |
| GET | `/health` | n/a | Open health check, used by Render and the keep-alive pinger |

## API structure (NestJS)

```
apps/api/src
  main.ts                      bootstrap, JSON body parsing, port
  app.module.ts                registers the global API key guard and the exception filter
  common/
    api-key.guard.ts           global guard, constant-time X-API-Key check, @Public() opt-out
    all-exceptions.filter.ts   turns every error into {"error": "..."}
    zod-validation.pipe.ts     validates request bodies with Zod
  slots/                       GET /slots, POST /reset
  bookings/
    bookings.service.ts        create (idempotency + atomic insert), get, cancel, list
    rate-limit.service.ts      sliding window per email
  prisma/                      PrismaService as a global module
  health/                      GET /health (public)
```

## How each level is handled

**Level 1.** Slots are stored with the id the client sends. A slot's `available` flag is `false` when it has a confirmed booking.

**Level 2.** The API key is compared in constant time before anything else runs. Zod validates the body: `name` and `email` are trimmed and `email` is stored in lower case. Missing, empty or invalid fields return 400. An unknown slot returns 404. A slot whose `start` has passed returns 400.

**Level 3: no double booking.** The database enforces it with a partial unique index:

```sql
CREATE UNIQUE INDEX bookings_one_confirmed_per_slot ON bookings (slot_id) WHERE status = 'confirmed';
```

A booking is inserted with `INSERT ... ON CONFLICT (slot_id) WHERE status = 'confirmed' DO NOTHING RETURNING ...`. If no row comes back, the slot is taken and the API returns 409. Postgres settles the race, so only one request can win, even across many API instances. Cancelling is a single conditional `UPDATE ... WHERE status = 'confirmed'`, so a second cancel returns 409. Cancelled bookings are not covered by the index, which frees the slot.

**Level 4: idempotency and paging.** When an `Idempotency-Key` is sent, the request takes a Postgres transaction-level advisory lock on that key, so simultaneous retries queue up instead of racing. The first request stores a SHA-256 hash of the canonical request body together with the status code and response. A later request with the same key and the same body gets the stored response back: same status and same booking id. The same key with a different body returns 422. Responses with 429 are not stored, so a retry after the limit lifts still goes through.

`GET /bookings` sorts by `(created_at, id)`. The cursor is an opaque base64url string of the last row's `(created_at, id)`, so pages never overlap or skip rows. `limit` must be an integer from 1 to 50.

**Level 5: rate limiting.** A sliding window of 5 attempts per normalized email per 60 seconds, stored in Postgres. Each attempt takes an advisory lock on its email, so a burst of simultaneous requests cannot slip past the limit. Failed attempts count. The 6th returns 429 with `Retry-After` set to the whole seconds until the oldest attempt leaves the window.

Order of checks in `POST /bookings`: API key → idempotency replay → rate limit → validation → slot exists → slot not started → atomic insert.

## Web page

- `/`: upcoming slots grouped by day, a filter by doctor, and booking from a side panel.
- `/bookings/:id`: the confirmation page with details and a cancel button.
- `/my-bookings`: look up bookings by email, with a "Load more" button that uses the cursor.

The browser never sees the API key. Pages and server actions call the API from the Next.js server using `API_URL` and `API_KEY` from the environment. Each booking submission sends an `Idempotency-Key`, and a retry of the same details reuses it, so a double click or a network retry cannot book twice.

## Running locally

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:migrate
npm run dev:api
npm run db:seed
npm run dev:web
```

Fill in the Supabase connection strings and an API key first. The web app's `API_KEY` must match the API's.

The end-to-end check runs every level against a running API. It calls `/reset`, so it wipes existing data:

```bash
npm run check -w apps/api
CHECK_API_URL=https://your-api.onrender.com npm run check -w apps/api
```

## Deployment

The API runs on Render and the web page runs on Vercel.

**API on Render**

1. In Render, create a new **Blueprint** from this repository. It reads `render.yaml`.
2. Set `DATABASE_URL` (the Supabase transaction pooler, port 6543, with `?pgbouncer=true&connection_limit=10&pool_timeout=20`), `DIRECT_URL` (the session pooler, port 5432) and `API_KEY`.
3. Migrations run during the build with `prisma migrate deploy`.

**Web on Vercel**

1. Import the repository in Vercel and set **Root Directory** to `apps/web`. Vercel detects Next.js and installs the npm workspace from the repository root.
2. Set `API_URL` (the Render API's https URL, with no trailing slash) and `API_KEY`.
3. `apps/web/vercel.json` runs the server functions in Frankfurt (`fra1`), close to the Render API.

**Keep-alive**

Render's free services sleep after about 15 minutes without traffic. In GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add `API_URL`. The workflow in `.github/workflows/keep-alive.yml` then pings `/health` every 10 minutes. Vercel doesn't sleep, so only the API needs pinging. One always-on service stays within Render's 750 free instance hours a month.
