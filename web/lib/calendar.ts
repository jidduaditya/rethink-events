type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  city: string;
  description: string | null;
};

function toIcsDt(iso: string): string {
  // "2026-07-01T10:00:00Z" → "20260701T100000Z"
  return iso.replace(/\.\d+/, "").replace(/[-:]/g, "");
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDt(event.starts_at)}/${toIcsDt(event.ends_at)}`,
    details: event.description ?? "",
    location: [event.venue, event.city].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsContent(event: CalendarEvent): string {
  const location = [event.venue, event.city].filter(Boolean).join(", ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ReThink Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@rethinkevents`,
    `DTSTART:${toIcsDt(event.starts_at)}`,
    `DTEND:${toIcsDt(event.ends_at)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${(event.description ?? "").replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
