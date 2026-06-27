/**
 * Slice 3.5 — curated feed data layer tests.
 * Verifies: anon sees published only; city filter; featured_for matching; going count aggregation.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, anon, makeUser, userClient, setProfile, wipeUsers } from "./helpers";

let hostId: string;
let blrEventId: string;
let puneEventId: string;
let pendingEventId: string;
let featuredEventId: string;

const BASE = {
  host_name: "Feed Tester",
  title: "Feed Test Event",
  starts_at: new Date(Date.now() + 86400_000).toISOString(),
  ends_at: new Date(Date.now() + 90000_000).toISOString(),
};

beforeAll(async () => {
  await wipeUsers();
  hostId = await makeUser("feedhost@test.local");
  await setProfile(hostId, { is_trusted: true, full_name: "Feed Tester" });

  const [blr, pune, pend, feat] = await Promise.all([
    admin.from("events").insert({ ...BASE, host_id: hostId, city: "bangalore", state: "published", title: "BLR Event" }).select("id").single(),
    admin.from("events").insert({ ...BASE, host_id: hostId, city: "pune", state: "published", title: "PNE Event" }).select("id").single(),
    admin.from("events").insert({ ...BASE, host_id: hostId, city: "bangalore", state: "pending_review", title: "Pending" }).select("id").single(),
    admin.from("events").insert({ ...BASE, host_id: hostId, city: "bangalore", state: "published", title: "Featured", featured_for: { goal: "level_up" } }).select("id").single(),
  ]);

  blrEventId = blr.data!.id;
  puneEventId = pune.data!.id;
  pendingEventId = pend.data!.id;
  featuredEventId = feat.data!.id;
}, 60_000);

afterAll(wipeUsers);

describe("feed — anon visibility", () => {
  it("shows published events", async () => {
    const { data } = await anon.from("events").select("id").eq("state", "published").in("id", [blrEventId, puneEventId]);
    expect(data?.length).toBe(2);
  });

  it("hides pending_review events", async () => {
    const { data } = await anon.from("events").select("id").eq("id", pendingEventId).maybeSingle();
    expect(data).toBeNull();
  });
});

describe("feed — city filter", () => {
  it("filters to bangalore only", async () => {
    const { data } = await anon
      .from("events")
      .select("id, city")
      .eq("state", "published")
      .eq("city", "bangalore")
      .in("id", [blrEventId, puneEventId]);
    expect(data?.every((e) => e.city === "bangalore")).toBe(true);
    expect(data?.some((e) => e.id === puneEventId)).toBe(false);
  });
});

describe("feed — featured_for", () => {
  it("featured_for goal matches correctly via SQL", async () => {
    const { data } = await anon
      .from("events")
      .select("id, featured_for")
      .eq("state", "published")
      .eq("id", featuredEventId)
      .single();
    expect((data?.featured_for as Record<string, string> | null)?.goal).toBe("level_up");
  });

  it("non-featured event has null featured_for", async () => {
    const { data } = await anon
      .from("events")
      .select("id, featured_for")
      .eq("id", blrEventId)
      .single();
    expect(data?.featured_for).toBeNull();
  });
});

describe("feed — going count aggregation", () => {
  it("going count increments for published event (anon-readable per 0005)", async () => {
    const memberId = await makeUser("feedmember@test.local");
    const client = await userClient("feedmember@test.local");

    await client.rpc("rsvp_to_event", { p_event_id: blrEventId });

    const { data: rows } = await anon
      .from("rsvps")
      .select("event_id")
      .eq("event_id", blrEventId)
      .eq("status", "going");

    expect(rows?.length).toBeGreaterThanOrEqual(1);

    await admin.auth.admin.deleteUser(memberId);
  });
});
