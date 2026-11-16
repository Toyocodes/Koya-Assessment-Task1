import { z } from "zod";

function requiredString(field: string) {
  return z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} must be a string` })
    .trim()
    .min(1, `${field} is required`);
}

export const newBookingSchema = z.object({
  slot_id: requiredString("slot_id").max(200, "slot_id is too long"),
  name: requiredString("name").max(200, "name is too long"),
  email: requiredString("email")
    .max(254, "email is too long")
    .email("email is not a valid email address")
    .transform((value) => value.toLowerCase()),
});

const isoDateTime = (field: string) =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} must be a string` })
    .refine((value) => !Number.isNaN(Date.parse(value)), `${field} must be a valid date-time`)
    .transform((value) => new Date(value));

export const resetSchema = z.object({
  slots: z
    .array(
      z.object({
        id: requiredString("slot id"),
        provider: requiredString("provider"),
        start: isoDateTime("start"),
        end: isoDateTime("end"),
      }),
      { required_error: "slots is required", invalid_type_error: "slots must be an array" },
    )
    .refine((slots) => new Set(slots.map((slot) => slot.id)).size === slots.length, "slot ids must be unique"),
});

export type ResetInput = z.infer<typeof resetSchema>;

export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "invalid request";
  }
  if (issue.code === "invalid_type" && issue.path.length === 0) {
    return "request body must be a JSON object";
  }
  return issue.message;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "" ? null : normalized;
}
