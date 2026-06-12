// OG image route for event detail pages.
// Uses Next.js ImageResponse (built into next/og — no extra package needed).
// Calls get_public_event RPC via Supabase REST so it works in edge runtime.
// Returns null (simple fallback) if event is not found or not approved.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Event";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens
const SURFACE = "#f9f9f9";
const ON_BACKGROUND = "#1b1b1b";
const SECONDARY = "#e3e800"; // Electric Yellow

type PublicEventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  city: string | null;
  location_name: string | null;
  event_type: string;
  host_name: string;
  status: string;
};

async function fetchPublicEvent(
  eventId: string
): Promise<PublicEventRow | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_public_event`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ p_event_id: eventId }),
        // Edge functions are short-lived; 5s is enough
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    // RPC returns null for non-approved events
    if (!data) return null;
    return data as PublicEventRow;
  } catch {
    return null;
  }
}

function formatOgDate(isoDate: string, timezone: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-IN", {
      timeZone: timezone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatOgTime(isoDate: string, timezone: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleTimeString("en-IN", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await fetchPublicEvent(id);

  // Fallback poster for missing/non-approved events
  if (!event) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            background: SURFACE,
            border: `8px solid ${ON_BACKGROUND}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "serif",
          }}
        >
          {/* Yellow corner block */}
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: SECONDARY,
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "18px",
                fontWeight: 700,
                color: ON_BACKGROUND,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              RETHINK EVENTS
            </span>
          </div>
          <span
            style={{
              fontFamily: "serif",
              fontSize: "64px",
              fontWeight: 900,
              color: ON_BACKGROUND,
              textTransform: "uppercase",
              textAlign: "center",
              padding: "0 80px",
            }}
          >
            RETHINK EVENTS
          </span>
        </div>
      ),
      { ...size }
    );
  }

  const dateStr = formatOgDate(event.starts_at, event.timezone);
  const timeStr = formatOgTime(event.starts_at, event.timezone);
  const locationStr =
    event.event_type === "online"
      ? "ONLINE"
      : (event.city ?? event.location_name ?? "").toUpperCase();
  const metaLine = [dateStr, timeStr, locationStr]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

  // Title font size: step down if title is long
  const titleFontSize = event.title.length > 60 ? 56 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: SURFACE,
          border: `8px solid ${ON_BACKGROUND}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Yellow corner block — top right */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: SECONDARY,
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "20px",
              fontWeight: 700,
              color: ON_BACKGROUND,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            RETHINK EVENTS
          </span>
        </div>

        {/* Event title — dominates the poster */}
        <div
          style={{
            fontFamily: "serif",
            fontSize: `${titleFontSize}px`,
            fontWeight: 900,
            color: ON_BACKGROUND,
            textTransform: "uppercase",
            lineHeight: 1.1,
            marginBottom: "28px",
            maxWidth: "900px",
          }}
        >
          {event.title}
        </div>

        {/* Mono metadata strip */}
        <div
          style={{
            borderTop: `4px solid ${ON_BACKGROUND}`,
            paddingTop: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "22px",
              fontWeight: 600,
              color: ON_BACKGROUND,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {metaLine}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "18px",
              fontWeight: 400,
              color: "#555555",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {event.host_name.toUpperCase()}
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
