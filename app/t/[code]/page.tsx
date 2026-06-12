// Ticket page — server component, no auth required (bearer link).
// Calls get_ticket(code) as anon via the Supabase server client.
// Layout: Electric Zine stub with QR for confirmed, position for waitlisted.

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QrCode } from "./qr-code";

// ─── Data shape returned by the get_ticket RPC ───────────────────────────────

type TicketData = {
  event_id: string;
  event_title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  venue: string;
  city: string | null;
  first_name: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  registration_code: string;
  waitlist_position: number | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    })
    .toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

// Format to YYYYMMDDTHHMMSSZ for Google Calendar URL.
function toGcalDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

// ─── Page ────────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TicketPage({ params }: PageProps) {
  const { code } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_ticket", { p_code: code });

  if (error || !data) {
    notFound();
  }

  const ticket = data as TicketData;

  if (!ticket || !ticket.event_id) {
    notFound();
  }

  const isConfirmed = ticket.status === "confirmed";
  const isWaitlisted = ticket.status === "waitlisted";

  const dateLabel = formatDate(ticket.starts_at);
  const startTime = formatTime(ticket.starts_at);
  const endTime = formatTime(ticket.ends_at);
  const locationLabel = ticket.city
    ? `${ticket.city} / ${ticket.venue}`
    : ticket.venue;

  const gcalStart = toGcalDate(ticket.starts_at);
  const gcalEnd = toGcalDate(ticket.ends_at);
  const gcalUrl = [
    "https://calendar.google.com/calendar/render?action=TEMPLATE",
    `&text=${encodeURIComponent(ticket.event_title)}`,
    `&dates=${gcalStart}/${gcalEnd}`,
    `&location=${encodeURIComponent(ticket.venue)}`,
  ].join("");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const eventUrl = `${siteUrl}/e/${ticket.event_id}`;
  const whatsappText = encodeURIComponent(
    `${ticket.event_title} — ${eventUrl}`
  );

  return (
    <div className="min-h-dvh bg-surface dot-grid flex items-start justify-center px-4 py-8">
      <div className="relative w-full max-w-md">
        {/* Hard shadow */}
        <div className="absolute inset-0 translate-x-2 translate-y-2 bg-on-background" />

        <div className="relative border-4 border-on-background bg-surface">
          {/* ── Status block ─────────────────────────────────────────────── */}
          <div
            className={
              isConfirmed
                ? "bg-secondary-container px-6 py-5 border-b-4 border-on-background"
                : "bg-surface-container px-6 py-5 border-b-4 border-on-background"
            }
          >
            <p className="font-mono text-label-data uppercase text-on-surface-variant mb-1">
              {ticket.first_name}
            </p>
            <h1 className="font-serif text-headline-lg font-black uppercase leading-tight text-on-background">
              {isConfirmed ? "YOU'RE IN" : "YOU'RE ON THE WAITLIST"}
            </h1>
          </div>

          {/* ── Event title ──────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b-2 border-on-background">
            <h2 className="font-serif text-headline-md font-bold text-on-background">
              {ticket.event_title}
            </h2>
          </div>

          {/* ── Metadata strip ───────────────────────────────────────────── */}
          <div className="px-6 py-3 border-b-4 border-on-background font-mono text-label-data uppercase text-on-surface-variant flex flex-wrap gap-2 items-center">
            <span>{dateLabel}</span>
            <span className="opacity-40">&middot;</span>
            <span>
              {startTime}&ndash;{endTime} IST
            </span>
            <span className="opacity-40">&middot;</span>
            <span>{locationLabel}</span>
          </div>

          {/* ── QR block (confirmed only) ─────────────────────────────────── */}
          {isConfirmed && (
            <div className="px-6 py-5 border-b-4 border-on-background flex flex-col items-center gap-3">
              <QrCode value={ticket.registration_code} />
              <p className="font-mono text-label-data uppercase tracking-widest text-on-surface-variant">
                {ticket.registration_code}
              </p>
            </div>
          )}

          {/* ── Waitlist position block ───────────────────────────────────── */}
          {isWaitlisted && (
            <div className="px-6 py-5 border-b-4 border-on-background text-center">
              {ticket.waitlist_position !== null && (
                <p className="font-serif text-display-sm font-black text-on-background mb-1">
                  #{ticket.waitlist_position}
                </p>
              )}
              <p className="font-mono text-label-data uppercase text-on-surface-variant">
                IN THE QUEUE
              </p>
              <p className="mt-3 font-sans text-body-sm text-on-surface-variant">
                IF A SPOT OPENS YOU WILL RECEIVE AN EMAIL AND YOUR TICKET WILL UPDATE AUTOMATICALLY.
              </p>
            </div>
          )}

          {/* ── Perforation ──────────────────────────────────────────────── */}
          <div className="border-t-4 border-dashed border-on-background" />

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <div className="px-6 py-5 flex flex-col gap-3">
            {isConfirmed && (
              <>
                {/* ADD TO GOOGLE CALENDAR */}
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block w-full"
                >
                  <div className="absolute inset-0 translate-x-1 translate-y-1 bg-on-background" />
                  <span className="relative flex items-center justify-center border-2 border-on-background bg-primary text-on-primary font-mono text-label-mono uppercase font-semibold py-3 px-6 w-full">
                    ADD TO GOOGLE CALENDAR
                  </span>
                </a>

                {/* DOWNLOAD .ICS */}
                <a
                  href={`/t/${ticket.registration_code}/ics`}
                  className="relative block w-full"
                >
                  <div className="absolute inset-0 translate-x-1 translate-y-1 bg-on-background" />
                  <span className="relative flex items-center justify-center border-2 border-on-background bg-surface text-on-background font-mono text-label-mono uppercase font-semibold py-3 px-6 w-full">
                    DOWNLOAD .ICS
                  </span>
                </a>
              </>
            )}

            {/* SHARE ON WHATSAPP (both states) */}
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block w-full"
            >
              <div className="absolute inset-0 translate-x-1 translate-y-1 bg-on-background" />
              <span className="relative flex items-center justify-center border-2 border-on-background bg-surface text-on-background font-mono text-label-mono uppercase font-semibold py-3 px-6 w-full">
                SHARE ON WHATSAPP
              </span>
            </a>

            {/* Back to event */}
            <div className="pt-1 text-center">
              <Link
                href={`/e/${ticket.event_id}`}
                className="font-mono text-label-data uppercase text-on-surface-variant underline underline-offset-4"
              >
                BACK TO EVENT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
