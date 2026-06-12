import { NextRequest, NextResponse } from "next/server";
import { email } from "@/lib/email";

type EmailRequest =
  | { type: "registration_confirmed"; to: string; event_title: string; ticket_url: string; gcal_url: string }
  | { type: "waitlisted"; to: string; event_title: string; position: number }
  | { type: "waitlist_promoted"; to: string; event_title: string; ticket_url: string };

export async function POST(request: NextRequest) {
  const body = (await request.json()) as EmailRequest;

  try {
    if (body.type === "registration_confirmed") {
      await email.sendRegistrationConfirmed(body.to, {
        event_title: body.event_title,
        ticket_url: body.ticket_url,
        gcal_url: body.gcal_url,
      });
    } else if (body.type === "waitlisted") {
      await email.sendWaitlisted(body.to, {
        event_title: body.event_title,
        position: body.position,
      });
    } else if (body.type === "waitlist_promoted") {
      await email.sendWaitlistPromoted(body.to, {
        event_title: body.event_title,
        ticket_url: body.ticket_url,
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
