CREATE TABLE "slots" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "start" TIMESTAMPTZ(3) NOT NULL,
    "end" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bookings_status_check" CHECK ("status" IN ('confirmed', 'cancelled'))
);

CREATE TABLE "idempotency_records" (
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "booking_attempts" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "booking_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "slots_provider_start_idx" ON "slots"("provider", "start");

CREATE INDEX "slots_start_idx" ON "slots"("start");

CREATE INDEX "bookings_slot_id_idx" ON "bookings"("slot_id");

CREATE INDEX "bookings_email_created_at_id_idx" ON "bookings"("email", "created_at", "id");

CREATE UNIQUE INDEX "bookings_one_confirmed_per_slot" ON "bookings"("slot_id") WHERE "status" = 'confirmed';

CREATE INDEX "booking_attempts_email_created_at_idx" ON "booking_attempts"("email", "created_at");

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
