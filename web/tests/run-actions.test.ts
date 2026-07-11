import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendBroadcastEmails } from "@/lib/email";
import { toggleCheckIn, sendBroadcast } from "@/app/(app)/organise/[id]/run/actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendBroadcastEmails: vi.fn().mockResolvedValue(undefined) }));

// --- anon client toggle chain ---
// from("rsvps").update({}).eq("event_id",...).eq("user_id",...).eq("status","going")
const mockToggleEqStatus = vi.fn().mockResolvedValue({ error: null });
const mockToggleEqUser = vi.fn(() => ({ eq: mockToggleEqStatus }));
const mockToggleEqEvent = vi.fn(() => ({ eq: mockToggleEqUser }));
const mockToggleUpdate = vi.fn(() => ({ eq: mockToggleEqEvent }));

// --- anon client event chain ---
// from("events").select(...).eq("id",...).single()
// from("events").update({...}).eq("id",...)
const mockSingle = vi.fn();
const mockSelectEq = vi.fn(() => ({ single: mockSingle }));
const mockEventSelect = vi.fn(() => ({ eq: mockSelectEq }));
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockEventUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

const mockAnonFrom = vi.fn((table: string) => {
  if (table === "rsvps") return { update: mockToggleUpdate };
  if (table === "events") return { select: mockEventSelect, update: mockEventUpdate };
  return {};
});

const mockAnonClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "host-1" } } }),
  },
  from: mockAnonFrom,
};

// --- service client chains ---
// from("rsvps").select("user_id").eq("event_id",...).eq("status","going")
const mockRsvpEqStatus = vi.fn().mockResolvedValue({ data: [{ user_id: "attendee-1" }], error: null });
const mockRsvpEqEvent = vi.fn(() => ({ eq: mockRsvpEqStatus }));
const mockRsvpSelect = vi.fn(() => ({ eq: mockRsvpEqEvent }));

// from("profiles").select("email").in("id", [...])
const mockProfileIn = vi.fn().mockResolvedValue({ data: [{ email: "attendee@example.com" }], error: null });
const mockProfileSelect = vi.fn(() => ({ in: mockProfileIn }));

const mockServiceFrom = vi.fn((table: string) => {
  if (table === "rsvps") return { select: mockRsvpSelect };
  if (table === "profiles") return { select: mockProfileSelect };
  return {};
});

const mockServiceClient = { from: mockServiceFrom };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(mockAnonClient as never);
  vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as never);
  // Default event: host-1 owns it, no broadcast yet
  mockSingle.mockResolvedValue({
    data: {
      id: "event-1",
      title: "Test Event",
      host_id: "host-1",
      broadcast_sent_at: null,
    },
    error: null,
  });
  // Re-attach auth.getUser on the anon client (vi.clearAllMocks resets it)
  mockAnonClient.auth.getUser.mockResolvedValue({ data: { user: { id: "host-1" } } });
});

describe("toggleCheckIn", () => {
  it("updates rsvps.checked_in and revalidates the run page", async () => {
    await toggleCheckIn("attendee-1", true, "event-1", new FormData());
    expect(mockAnonFrom).toHaveBeenCalledWith("rsvps");
    expect(mockToggleUpdate).toHaveBeenCalledWith({ checked_in: true });
    expect(mockToggleEqEvent).toHaveBeenCalledWith("event_id", "event-1");
    expect(mockToggleEqUser).toHaveBeenCalledWith("user_id", "attendee-1");
    expect(mockToggleEqStatus).toHaveBeenCalledWith("status", "going");
    expect(revalidatePath).toHaveBeenCalledWith("/organise/event-1/run");
  });

  it("does not toggle check-in when caller is not the event host", async () => {
    mockAnonClient.auth.getUser.mockResolvedValue({ data: { user: { id: "not-host" } } });
    await toggleCheckIn("attendee-1", true, "event-1", new FormData());
    expect(mockToggleUpdate).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("sendBroadcast", () => {
  it("sends emails and records broadcast_sent_at when not yet sent", async () => {
    const fd = new FormData();
    fd.append("message", "Hello attendees!");
    await sendBroadcast("event-1", fd);
    expect(sendBroadcastEmails).toHaveBeenCalledWith(
      ["attendee@example.com"],
      "Test Event",
      "Hello attendees!"
    );
    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        broadcast_message: "Hello attendees!",
        broadcast_sent_at: expect.any(String),
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/organise/event-1/run");
  });

  it("does not call Resend when broadcast_sent_at is already set", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "event-1",
        title: "Test Event",
        host_id: "host-1",
        broadcast_sent_at: "2026-06-28T10:00:00Z",
      },
      error: null,
    });
    const fd = new FormData();
    fd.append("message", "Second message");
    await sendBroadcast("event-1", fd);
    expect(sendBroadcastEmails).not.toHaveBeenCalled();
    expect(mockEventUpdate).not.toHaveBeenCalled();
  });

  it("does not send emails when caller is not the event host", async () => {
    mockAnonClient.auth.getUser.mockResolvedValue({ data: { user: { id: "not-host" } } });
    const fd = new FormData();
    fd.append("message", "Hijack attempt");
    await sendBroadcast("event-1", fd);
    expect(sendBroadcastEmails).not.toHaveBeenCalled();
  });
});
