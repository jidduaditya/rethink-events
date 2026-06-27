import { ImageResponse } from "next/og";
import { MOCK_EVENTS } from "@/lib/mock";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CITY_BG: Record<string, string> = {
  bangalore: "#e3e800",
  pune: "#2e5bff",
  delhi: "#ff4444",
  hyderabad: "#00c896",
};

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = MOCK_EVENTS.find((e) => e.id === id);

  const accentBg = event ? (CITY_BG[event.city] ?? "#e3e800") : "#e3e800";
  const accentText = event?.city === "bangalore" ? "#646700" : "#ffffff";

  // Load Source Serif 4 for the OG card
  const fontRes = await fetch(
    "https://fonts.gstatic.com/s/sourceserif4/v8/vEFR2zZAav_Hvkzlsaieran11cEuRSQs.woff"
  );
  const fontData = await fontRes.arrayBuffer();

  if (!event) {
    return new ImageResponse(
      <div
        style={{
          width: "100%", height: "100%",
          background: "#f9f9f9",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "serif",
        }}
      >
        <span style={{ fontSize: 48, fontWeight: 900, color: "#1b1b1b" }}>
          RETHINK EVENTS
        </span>
      </div>,
      { ...size, fonts: [{ name: "serif", data: fontData, weight: 900 }] }
    );
  }

  const dateStr = new Date(event.starts_at).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  }).toUpperCase();

  const spotsLeft = event.capacity != null
    ? event.capacity - (event.going_count ?? 0)
    : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        background: "#f9f9f9",
        display: "flex", flexDirection: "column",
        border: "8px solid #1b1b1b",
      }}
    >
      {/* accent stripe */}
      <div style={{ background: accentBg, height: 16, width: "100%" }} />

      <div style={{ display: "flex", flex: 1, padding: "56px 72px", gap: 48 }}>
        {/* left: title + meta */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 24 }}>
          {/* brand */}
          <span style={{
            fontFamily: "monospace", fontSize: 18, fontWeight: 700,
            letterSpacing: "0.2em", color: "#747688", textTransform: "uppercase",
          }}>
            RETHINK EVENTS
          </span>

          {/* title */}
          <span style={{
            fontFamily: "serif", fontSize: 72, fontWeight: 900, lineHeight: 1.05,
            color: "#1b1b1b", textTransform: "uppercase", letterSpacing: "-0.02em",
          }}>
            {event.title}
          </span>

          {/* date + venue */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
            <span style={{
              fontFamily: "monospace", fontSize: 22, fontWeight: 600,
              color: "#434656", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {dateStr}
            </span>
            {event.venue && (
              <span style={{
                fontFamily: "monospace", fontSize: 18,
                color: "#747688", textTransform: "uppercase",
              }}>
                {event.venue}
              </span>
            )}
          </div>
        </div>

        {/* right: city chip + spots */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end",
          justifyContent: "space-between", minWidth: 200,
        }}>
          <div style={{
            background: accentBg, color: accentText,
            border: "4px solid #1b1b1b",
            padding: "12px 24px",
            fontFamily: "monospace", fontSize: 28, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            {event.city.toUpperCase()}
          </div>

          {spotsLeft != null && (
            <div style={{
              border: "4px solid #1b1b1b",
              padding: "12px 24px",
              fontFamily: "monospace", fontSize: 20, fontWeight: 600,
              textTransform: "uppercase", color: spotsLeft <= 5 ? "#0040e0" : "#1b1b1b",
            }}>
              {spotsLeft === 0 ? "FULL" : `${spotsLeft} SPOTS LEFT`}
            </div>
          )}

          <span style={{
            fontFamily: "monospace", fontSize: 16,
            color: "#747688", textTransform: "uppercase",
          }}>
            rethink.pm
          </span>
        </div>
      </div>

      {/* bottom stripe */}
      <div style={{ background: "#1b1b1b", height: 8, width: "100%" }} />
    </div>,
    {
      ...size,
      fonts: [{ name: "serif", data: fontData, weight: 900, style: "normal" }],
    }
  );
}
