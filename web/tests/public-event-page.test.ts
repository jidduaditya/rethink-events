/**
 * Slice 3.3 — public event page data layer tests.
 * Verifies that the DB queries backing the event page return correct data
 * for anon users, and that non-public events return nothing (RLS).
 *
 * Requires real Supabase instance with migrations applied.
 * Run: npm test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, anon, makeUser, userClient, setProfile, wipeUsers } from "./helpers";

let trustedHostId: string;
let publishedEventId: string;
let pendingEventId: string;
let cancelledEventId: string;

beforeAll(async () => {
  await wipeUsers();
  trustedHostId = await makeUser("host3@test.local");
  await setProfile(trustedHostId, { is_trusted: true, full_name: "Test Host" });

  // Insert events directly via service role to control state
  const base = {
    host_id: trustedHostId,
    host_name: "Test Host",
    title: "Public Event Test",
    city: "bangalore",
    starts_at: new Date(Date.now() + 86400_000).toISOString(),
    ends_at: new Date(Date.now() + 90000_000).toISOString(),
  };

  const { data: pub } = await admin.from("events").insert({ ...base, state: "published" }).select("id").single();
  publishedEventId = pub!.id;

  const { data: pend } = await admin.from("events").insert({ ...base, title: "Pending Event", state: "pending_review" }).select("id").single();
  pendingEventId = pend!.id;

  const { data: canc } = await admin.from("events").insert({ ...base, title: "Cancelled Event", state: "cancelled" }).select("id").single();
  cancelledEventId = canc!.id;
}, 60_000);

afterAll(wipeUsers);

describe("event page — anon visibility", () => {
  it("can fetch a published event", async () => {
    const { data, error } = await anon
      .from("events")
      .select("id, title, city, state")
      .eq("id", publishedEventId)
      .single();
    expect(error).toBeNull();
    expect(data?.state).toBe("published");
  });

  it("cannot fetch a pending_review event", async () => {
    const { data } = await anon
      .from("events")
      .select("id")
      .eq("id", pendingEventId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("can fetch a cancelled event", async () => {
    const { data } = await anon
      .from("events")
      .select("id, state")
      .eq("id", cancelledEventId)
      .maybeSingle();
    expect(data?.state).toBe("cancelled");
  });
});

describe("event page — going count", () => {
  it("going count increments when an RSVP is added", async () => {
    const memberId = await makeUser("member3@test.local");
    const memberClient = await userClient("member3@test.local");

    const { count: before } = await anon
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", publishedEventId)
      .eq("status", "going");

    await memberClient.rpc("rsvp_to_event", { p_event_id: publishedEventId });

    const { count: after } = await anon
      .from("rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", publishedEventId)
      .eq("status", "going");

    expect(after).toBe((before ?? 0) + 1);

    await admin.auth.admin.deleteUser(memberId);
  });
});

describe("event page — my RSVP state", () => {
  it("returns the user's RSVP row when going", async () => {
    const memberId = await makeUser("member3b@test.local");
    const client = await userClient("member3b@test.local");

    await client.rpc("rsvp_to_event", { p_event_id: publishedEventId });

    const { data } = await client
      .from("rsvps")
      .select("id, status")
      .eq("event_id", publishedEventId)
      .eq("user_id", memberId)
      .maybeSingle();

    expect(data?.status).toBe("going");

    await admin.auth.admin.deleteUser(memberId);
  });

  it("returns null for anon user (no RSVP row)", async () => {
    const { data } = await anon
      .from("rsvps")
      .select("id")
      .eq("event_id", publishedEventId)
      .maybeSingle();
    // anon cannot read rsvps at all per RLS
    expect(data).toBeNull();
  });
});
