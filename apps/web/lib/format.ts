const CLINIC_TIME_ZONE = "Africa/Lagos";

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: CLINIC_TIME_ZONE,
});

const shortDayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: CLINIC_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: CLINIC_TIME_ZONE,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: CLINIC_TIME_ZONE,
});

export function formatDay(iso: string): string {
  return dayFormatter.format(new Date(iso));
}

function formatShortDay(iso: string): string {
  return shortDayFormatter.format(new Date(iso));
}

function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

export function dayKey(iso: string): string {
  return dayKeyFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatShortDay(iso)}, ${formatTime(iso)}`;
}
