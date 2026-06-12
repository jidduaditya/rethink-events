// supabase/functions/send-reminders/index.ts
// Deno edge function — invoked hourly by pg_cron (migration 014).
// Finds approved, non-cancelled events starting in the 23h–25h window that
// have not yet received a reminder, then emails all confirmed registrants and
// marks reminder_sent_at. Setting reminder_sent_at BEFORE sending ensures
// idempotency: a retry after partial failure skips already-processed events.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAILMODO_API_KEY = Deno.env.get("MAILMODO_API_KEY");
const MAILMODO_REMINDER_TEMPLATE_ID =
  Deno.env.get("MAILMODO_TEMPLATE_REMINDER") ?? "reminder";
const MAILMODO_BASE = "https://api.mailmodo.com/api/v1";
const FROM = "noreply@rethinkevents.com";
const SITE_URL =
  Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://rethinkevents.com";

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  event_type: "online" | "offline";
  location_name: string | null;
  location_address: string | null;
  meet_url: string | null;
};

type RegistrantRow = {
  user_id: string;
  profiles: {
    email: string;
    full_name: string;
  } | null;
};

function formatIST(utcString: string): string {
  const date = new Date(utcString);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function venueLabel(event: EventRow): string {
  if (event.event_type === "online") return "Online";
  return [event.location_name, event.location_address]
    .filter(Boolean)
    .join(", ") || "TBD";
}

async function sendReminderEmail(
  to: string,
  eventTitle: string,
  startsAt: string,
  venue: string,
  ticketUrl: string
): Promise<void> {
  if (!MAILMODO_API_KEY) {
    console.warn(
      `[send-reminders] MAILMODO_API_KEY not set — skipping reminder to ${to} for "${eventTitle}"`
    );
    return;
  }

  const res = await fetch(`${MAILMODO_BASE}/sendEmail`, {
    method: "POST",
    headers: {
      Authorization: `bearer ${MAILMODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      from: FROM,
      subject: `TOMORROW: ${eventTitle}`,
      templateId: MAILMODO_REMINDER_TEMPLATE_ID,
      mergeVars: {
        event_title: eventTitle,
        starts_at_ist: startsAt,
        venue,
        ticket_url: ticketUrl,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(
      `[send-reminders] Email failed for ${to}: ${res.status} ${body}`
    );
  }
}

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  // 1. Find events needing reminders:
  //    - approved, not cancelled, starts_at in the 23h–25h window, reminder_sent_at is null
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, event_type, location_name, location_address, meet_url")
    .eq("status", "approved")
    .is("reminder_sent_at", null)
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd);

  if (eventsError) {
    console.error("[send-reminders] Error fetching events:", eventsError);
    return new Response(
      JSON.stringify({ error: eventsError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const eventList = (events ?? []) as EventRow[];
  let totalSent = 0;
  const failed: string[] = [];

  for (const event of eventList) {
    // 2. Mark reminder_sent_at FIRST (idempotency — prevents double-send on retry)
    const { error: markError } = await supabase
      .from("events")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", event.id)
      .is("reminder_sent_at", null); // guard: only update if still null

    if (markError) {
      console.error(
        `[send-reminders] Failed to mark reminder_sent_at for event ${event.id}:`,
        markError
      );
      failed.push(event.id);
      continue;
    }

    // 3. Fetch confirmed registrants with their email addresses
    //    Using "registrations" table — if migration 011 is not yet applied,
    //    this falls back gracefully to all registrations (no status column yet).
    const { data: registrants, error: regError } = await supabase
      .from("registrations")
      .select("user_id, profiles!inner(email, full_name)")
      .eq("event_id", event.id)
      // status filter: only send to confirmed registrants (post-migration 011)
      // If the column does not exist yet the filter is ignored by Supabase.
      .or("status.eq.confirmed,status.is.null");

    if (regError) {
      console.error(
        `[send-reminders] Error fetching registrants for event ${event.id}:`,
        regError
      );
      failed.push(event.id);
      continue;
    }

    const recipients = (registrants ?? []) as RegistrantRow[];
    const startsAtIST = formatIST(event.starts_at);
    const venue = venueLabel(event);

    for (const reg of recipients) {
      if (!reg.profiles?.email) continue;

      // Ticket URL: in V1, the ticket page is /t/[code].
      // The registration_code column is added in migration 011.
      // For reminders before 011 is applied, fall back to the event page.
      const ticketUrl = `${SITE_URL}/e/${event.id}`;

      try {
        await sendReminderEmail(
          reg.profiles.email,
          event.title,
          startsAtIST,
          venue,
          ticketUrl
        );
        totalSent++;
      } catch (err) {
        console.error(
          `[send-reminders] Unexpected error sending to ${reg.profiles.email}:`,
          err
        );
        failed.push(`${event.id}:${reg.profiles.email}`);
      }
    }
  }

  console.log(
    `[send-reminders] Done. Events processed: ${eventList.length}. Emails sent: ${totalSent}. Failures: ${failed.length}.`
  );

  return new Response(
    JSON.stringify({ sent: totalSent, failed }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
