// ICS download route — /t/[code]/ics
// Calls get_ticket(code), generates an ICS file, returns it as text/calendar.

import { NextRequest, NextResponse } from "next/server";
import { createEvent } from "ics";
import { createClient } from "@/lib/supabase/server";

type TicketData = {
  event_id: string;
  event_title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  venue: string;
  city: string | null;
};

// Convert an ISO date string to the [year, month, day, hour, minute] array
// that the `ics` package expects, in IST (UTC+5:30).
function toIcsDateArray(
  iso: string
): [number, number, number, number, number] {
  const utc = new Date(iso);
  // IST = UTC + 5h30m
  const ist = new Date(utc.getTime() + 5.5 * 60 * 60 * 1000);
  return [
    ist.getUTCFullYear(),
    ist.getUTCMonth() + 1,
    ist.getUTCDate(),
    ist.getUTCHours(),
    ist.getUTCMinutes(),
  ];
}

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { code } = await context.params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_ticket", { p_code: code });

  if (error || !data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ticket = data as TicketData;
  if (!ticket || !ticket.event_id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const eventUrl = `${siteUrl}/e/${ticket.event_id}`;

  const { error: icsError, value: icsContent } = createEvent({
    title: ticket.event_title,
    start: toIcsDateArray(ticket.starts_at),
    end: toIcsDateArray(ticket.ends_at),
    location: ticket.venue,
    url: eventUrl,
  });

  if (icsError || !icsContent) {
    return new NextResponse("Failed to generate ICS", { status: 500 });
  }

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
