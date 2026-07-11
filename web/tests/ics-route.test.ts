import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/ics/[eventId]/route";

const mockEventData = {
  id: "event-1",
  title: "Test Event",
  city: "bangalore",
  venue: "Test Venue",
  starts_at: "2026-07-01T10:00:00Z",
  ends_at: "2026-07-01T12:00:00Z",
  description: "Test description",
};

const mockSingle = vi.fn().mockResolvedValue({ data: mockEventData, error: null });
const mockEqState = vi.fn(() => ({ single: mockSingle }));
const mockEqId = vi.fn(() => ({ eq: mockEqState }));
const mockSelect = vi.fn(() => ({ eq: mockEqId }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock("@/lib/calendar", () => ({
  buildIcsContent: vi.fn(() => "BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
}));

describe("GET /api/ics/[eventId]", () => {
  it("returns text/calendar content-type", async () => {
    const response = await GET(
      new Request("http://localhost/api/ics/event-1"),
      { params: Promise.resolve({ eventId: "event-1" }) }
    );
    expect(response.headers.get("content-type")).toContain("text/calendar");
  });
});
