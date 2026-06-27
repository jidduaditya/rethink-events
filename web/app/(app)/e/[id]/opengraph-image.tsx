import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CITY_BG: Record<string, string> = {
  bangalore: "#e3e800",
  pune: "#2e5bff",
  delhi: "#ff4444",
  hyderabad: "#00c896",
};

const CITY_TEXT: Record<string, string> = {
  bangalore: "#646700",
  pune: "#ffffff",
  delhi: "#ffffff",
  hyderabad: "#ffffff",
};

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ponytail: anon client — edge runtime has no cookies; published events are readable by anon per RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: event } = await supabase
    .from("events")
    .select("title, description, city, venue, starts_at, capacity, host_name")
    .eq("id", id)
    .single();

  const { count: goingCount } = event
    ? await supabase
        .from("rsvps")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "going")
    : { count: 0 };

  const fontRes = await fetch(
    "https://fonts.gstatic.com/s/sourceserif4/v8/vEFR2zZAav_Hvkzlsaieran11cEuRSQs.woff"
  );
  const fontData = await fontRes.arrayBuffer();

  if (!event) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", background: "#f9f9f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 48, fontWeight: 900, color: "#1b1b1b", fontFamily: "serif" }}>
          RETHINK EVENTS
        </span>
      </div>,
      { ...size, fonts: [{ name: "serif", data: fontData, weight: 900 }] }
    );
  }

  const accentBg = CITY_BG[event.city] ?? "#e3e800";
  const accentText = CITY_TEXT[event.city] ?? "#646700";

  const dateStr = new Date(event.starts_at).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  }).toUpperCase();

  const going = goingCount ?? 0;
  const spotsLeft = event.capacity != null ? event.capacity - going : null;
  const isFull = event.capacity != null && going >= event.capacity;

  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        background: "#f9f9f9",
        display: "flex", flexDirection: "column",
        border: "8px solid #1b1b1b",
      }}
    >
      <div style={{ background: accentBg, height: 16, width: "100%" }} />

      <div style={{ display: "flex", flex: 1, padding: "56px 72px", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 24 }}>
          <span style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, letterSpacing: "0.2em", color: "#747688", textTransform: "uppercase" }}>
            RETHINK EVENTS
          </span>
          <span style={{ fontFamily: "serif", fontSize: 72, fontWeight: 900, lineHeight: 1.05, color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "-0.02em" }}>
            {event.title}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
            <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 600, color: "#434656", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {dateStr}
            </span>
            {event.venue && (
              <span style={{ fontFamily: "monospace", fontSize: 18, color: "#747688", textTransform: "uppercase" }}>
                {event.venue}
              </span>
            )}
            {event.host_name && (
              <span style={{ fontFamily: "monospace", fontSize: 16, color: "#747688", textTransform: "uppercase" }}>
                HOSTED BY {event.host_name.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", minWidth: 200 }}>
          <div style={{ background: accentBg, color: accentText, border: "4px solid #1b1b1b", padding: "12px 24px", fontFamily: "monospace", fontSize: 28, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {event.city.toUpperCase()}
          </div>

          {event.capacity != null && (
            <div style={{ border: "4px solid #1b1b1b", padding: "12px 24px", fontFamily: "monospace", fontSize: 20, fontWeight: 600, textTransform: "uppercase", color: isFull ? "#ba1a1a" : spotsLeft != null && spotsLeft <= 5 ? "#0040e0" : "#1b1b1b" }}>
              {isFull ? "FULL" : `${spotsLeft} SPOTS LEFT`}
            </div>
          )}

          {event.capacity == null && going > 0 && (
            <div style={{ border: "4px solid #1b1b1b", padding: "12px 24px", fontFamily: "monospace", fontSize: 20, fontWeight: 600, textTransform: "uppercase", color: "#1b1b1b" }}>
              {going} GOING
            </div>
          )}

          <span style={{ fontFamily: "monospace", fontSize: 16, color: "#747688", textTransform: "uppercase" }}>
            rethink.pm
          </span>
        </div>
      </div>

      <div style={{ background: "#1b1b1b", height: 8, width: "100%" }} />
    </div>,
    { ...size, fonts: [{ name: "serif", data: fontData, weight: 900, style: "normal" }] }
  );
}
