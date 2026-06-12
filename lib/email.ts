// lib/email.ts
// All transactional email goes through this module.
// If MAILMODO_API_KEY is absent, calls are logged and resolve as no-ops —
// dev and test environments never block on a missing key.
// Startup warning is printed once on the first attempted send.

const MAILMODO_API_KEY = process.env.MAILMODO_API_KEY;
const MAILMODO_BASE = "https://api.mailmodo.com/api/v1";
const FROM = "noreply@rethinkevents.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rethinkevents.com";

// Logged once so it surfaces clearly in Vercel logs without flooding them.
let _missingKeyWarned = false;

type EmailPayload = {
  to: string;
  subject: string;
  templateId: string;
  mergeVars: Record<string, string | number>;
};

async function send(payload: EmailPayload): Promise<void> {
  if (!MAILMODO_API_KEY) {
    if (!_missingKeyWarned) {
      console.warn(
        "[email] MAILMODO_API_KEY is not set. All transactional emails will be no-ops. Set this env var in .env.local and Vercel to enable sending."
      );
      _missingKeyWarned = true;
    }
    console.warn(
      `[email] Skipping send — subject: "${payload.subject}" → ${payload.to}`
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
      to: payload.to,
      from: FROM,
      subject: payload.subject,
      templateId: payload.templateId,
      mergeVars: payload.mergeVars,
    }),
  });

  if (!res.ok) {
    console.error(
      `[email] Send failed — subject: "${payload.subject}" → ${payload.to}. Status: ${res.status}. Body: ${await res.text()}`
    );
  }
}

// Template IDs — set these in env or Mailmodo dashboard once templates are created.
// Fallback strings are dev placeholders so the module never throws on startup.
const TEMPLATES = {
  registrationConfirmed:
    process.env.MAILMODO_TEMPLATE_REGISTRATION_CONFIRMED ??
    "registration_confirmed",
  waitlisted:
    process.env.MAILMODO_TEMPLATE_WAITLISTED ?? "waitlisted",
  reminder:
    process.env.MAILMODO_TEMPLATE_REMINDER ?? "reminder",
  waitlistPromoted:
    process.env.MAILMODO_TEMPLATE_PROMOTED ?? "waitlist_promoted",
  hostUpdate:
    process.env.MAILMODO_TEMPLATE_HOST_UPDATE ?? "host_update",
  eventCancelled:
    process.env.MAILMODO_TEMPLATE_EVENT_CANCELLED ?? "event_cancelled",
};

export const email = {
  /**
   * Sent immediately after a native RSVP is confirmed.
   * Includes a link to the ticket page (/t/[code]) and a Google Calendar URL.
   * Template merge vars: event_title, ticket_url, gcal_url
   */
  sendRegistrationConfirmed: (
    to: string,
    vars: { event_title: string; ticket_url: string; gcal_url: string }
  ) =>
    send({
      to,
      subject: `YOU'RE IN: ${vars.event_title}`,
      templateId: TEMPLATES.registrationConfirmed,
      mergeVars: vars,
    }),

  /**
   * Sent when a native RSVP lands on the waitlist (event is full).
   * Template merge vars: event_title, position
   */
  sendWaitlisted: (
    to: string,
    vars: { event_title: string; position: number }
  ) =>
    send({
      to,
      subject: `YOU'RE ON THE WAITLIST: ${vars.event_title}`,
      templateId: TEMPLATES.waitlisted,
      mergeVars: vars,
    }),

  /**
   * Sent by the send-reminders edge function ~24h before event start.
   * Template merge vars: event_title, starts_at_ist, venue, ticket_url
   */
  sendReminder: (
    to: string,
    vars: {
      event_title: string;
      starts_at_ist: string;
      venue: string;
      ticket_url: string;
    }
  ) =>
    send({
      to,
      subject: `TOMORROW: ${vars.event_title}`,
      templateId: TEMPLATES.reminder,
      mergeVars: vars,
    }),

  /**
   * Sent when a waitlisted attendee is auto-promoted to confirmed.
   * Template merge vars: event_title, ticket_url
   */
  sendWaitlistPromoted: (
    to: string,
    vars: { event_title: string; ticket_url: string }
  ) =>
    send({
      to,
      subject: `A SPOT OPENED: YOU'RE IN — ${vars.event_title}`,
      templateId: TEMPLATES.waitlistPromoted,
      mergeVars: vars,
    }),

  /**
   * Sent to all confirmed + waitlisted registrants when the host sends a broadcast.
   * Template merge vars: event_title, body, event_url
   */
  sendHostUpdate: (
    to: string,
    vars: { event_title: string; body: string; event_url: string }
  ) =>
    send({
      to,
      subject: `UPDATE: ${vars.event_title}`,
      templateId: TEMPLATES.hostUpdate,
      mergeVars: vars,
    }),

  /**
   * Sent to all confirmed + waitlisted registrants when the host cancels the event.
   * Template merge vars: event_title, reason
   */
  sendEventCancelled: (
    to: string,
    vars: { event_title: string; reason: string }
  ) =>
    send({
      to,
      subject: `CANCELLED: ${vars.event_title}`,
      templateId: TEMPLATES.eventCancelled,
      mergeVars: vars,
    }),

  /** Exposed for integration tests and the send-reminders edge function. */
  _siteUrl: SITE_URL,
};
