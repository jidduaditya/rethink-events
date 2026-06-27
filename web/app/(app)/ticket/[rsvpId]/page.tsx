import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true,
  }).toUpperCase();
}

export default async function TicketPage({ params }: { params: Promise<{ rsvpId: string }> }) {
  const { rsvpId } = await params;
  const { userId, profile } = await requireAuth();

  const supabase = await createClient();

  const { data: rsvp } = await supabase
    .from("rsvps")
    .select("id, event_id, status")
    .eq("id", rsvpId)
    .eq("user_id", userId)
    .eq("status", "going")
    .maybeSingle();

  if (!rsvp) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, description, city, venue, starts_at, ends_at")
    .eq("id", rsvp.event_id)
    .single();

  if (!event) notFound();

  const gcalUrl = new URL("https://calendar.google.com/calendar/render");
  gcalUrl.searchParams.set("action", "TEMPLATE");
  gcalUrl.searchParams.set("text", event.title);
  gcalUrl.searchParams.set("dates",
    `${new Date(event.starts_at).toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${new Date(event.ends_at).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`
  );
  if (event.venue) gcalUrl.searchParams.set("location", event.venue);

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ReThink Events//EN",
    "BEGIN:VEVENT",
    `UID:${rsvp.id}@rethink.pm`,
    `DTSTART:${new Date(event.starts_at).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTEND:${new Date(event.ends_at).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.venue ?? ""}`,
    `DESCRIPTION:${event.description ?? ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-grid-margin py-stack-xl">
        <div className="border-4 border-on-background bg-background hard-shadow">
          <div className="h-3 w-full bg-secondary-container" />

          <div className="p-8">
            <div className="flex items-center justify-between">
              <span className="font-mono text-label-data font-semibold uppercase tracking-widest text-on-surface-variant">
                RETHINK EVENTS
              </span>
              <span className="border-2 border-on-background bg-primary px-3 py-1 font-mono text-label-data font-semibold uppercase text-on-primary">
                TICKET
              </span>
            </div>

            <h1 className="mt-stack-lg font-serif text-headline-lg font-black uppercase leading-tight">
              {event.title}
            </h1>

            <div className="my-6 border-y-4 border-dashed border-on-background py-4">
              <div className="grid grid-cols-2 gap-4">
                <TicketField label="DATE" value={formatDate(event.starts_at)} />
                <TicketField label="TIME" value={`${formatTime(event.starts_at)} – ${formatTime(event.ends_at)}`} />
                <TicketField label="VENUE" value={event.venue ?? "TBC"} />
                <TicketField label="CITY" value={event.city.toUpperCase()} />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono text-label-data uppercase tracking-widest text-on-surface-variant">
                  ATTENDEE
                </p>
                <p className="mt-1 font-mono text-label-mono font-semibold uppercase">
                  {profile.full_name ?? "—"}
                </p>
              </div>
              {/* ponytail: QR is V2 */}
              <div className="flex size-20 items-center justify-center border-2 border-on-background bg-surface-container">
                <span className="font-mono text-label-data uppercase text-on-surface-variant">QR</span>
              </div>
            </div>

            <p className="mt-4 font-mono text-label-data uppercase text-on-surface-variant">
              ID: {rsvpId.toUpperCase()}
            </p>
          </div>

          <div className="h-2 w-full bg-on-background" />
        </div>

        <div className="mt-stack-lg flex flex-col gap-3 sm:flex-row">
          <Link
            href={gcalUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center border-2 border-on-background bg-background px-6 font-mono text-label-mono font-semibold uppercase transition-colors hover:bg-secondary-container hard-shadow hard-shadow-hover"
          >
            + ADD TO CALENDAR
          </Link>
          <a
            href={`data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`}
            download={`rethink-${event.id}.ics`}
            className="inline-flex h-11 items-center justify-center border-2 border-on-background bg-background px-6 font-mono text-label-mono font-semibold uppercase transition-colors hover:bg-secondary-container hard-shadow hard-shadow-hover"
          >
            DOWNLOAD ICS
          </a>
        </div>

        <div className="mt-stack-lg">
          <Link
            href={`/e/${event.id}`}
            className="font-mono text-label-mono uppercase text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4"
          >
            ← BACK TO EVENT
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function TicketField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-label-data uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-label-mono font-semibold uppercase">
        {value}
      </p>
    </div>
  );
}
