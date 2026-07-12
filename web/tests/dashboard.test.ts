/**
 * Phase 4 — dashboard data layer: hosting, attending, upcoming queries.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, makeUser, userClient, setProfile, wipeUsers } from "./helpers";

let meId: string;
let otherHostId: string;
let myEventId: string;
let attendingEventId: string;
let otherEventId: string;
let me: Awaited<ReturnType<typeof userClient>>;

const BASE = {
  title: "Dash Test",
  city: "bangalore" as const,
  starts_at: new Date(Date.now() + 86400_000).toISOString(),
  ends_at: new Date(Date.now() + 90000_000).toISOString(),
};

beforeAll(async () => {
  await wipeUsers();
  meId = await makeUser("dash-me@test.local");
  otherHostId = await makeUser("dash-host@test.local");
  await setProfile(meId, { is_trusted: true, full_name: "Dash Me" });
  await setProfile(otherHostId, { is_trusted: true, full_name: "Dash Host" });

  const [mine, attending, other] = await Promise.all([
    admin.from("events").insert({ ...BASE, host_id: meId, host_name: "Dash Me", state: "published", title: "Mine" }).select("id").single(),
    admin.from("events").insert({ ...BASE, host_id: otherHostId, host_name: "Dash Host", state: "published", title: "Attending" }).select("id").single(),
    admin.from("events").insert({ ...BASE, host_id: otherHostId, host_name: "Dash Host", state: "published", title: "Other" }).select("id").single(),
  ]);
  myEventId = mine.data!.id;
  attendingEventId = attending.data!.id;
  otherEventId = other.data!.id;

  me = await userClient("dash-me@test.local");
  await me.rpc("rsvp_to_event", { p_event_id: attendingEventId });
}, 60_000);

afterAll(wipeUsers);

describe("dashboard queries", () => {
  it("hosting: returns my own events", async () => {
    const { data } = await me
      .from("events")
      .select("id")
      .eq("host_id", meId)
      .not("state", "in", '("cancelled","taken_down")');
    expect(data?.map((e) => e.id)).toContain(myEventId);
    expect(data?.map((e) => e.id)).not.toContain(otherEventId);
  });

  it("attending: returns events joined through my going RSVPs", async () => {
    const { data } = await me
      .from("rsvps")
      .select("event_id, events(id, title, starts_at)")
      .eq("user_id", meId)
      .eq("status", "going");
    const ids = (data ?? []).map((r) => r.event_id);
    expect(ids).toContain(attendingEventId);
    expect(ids).not.toContain(otherEventId);
  });

  it("upcoming: published events exclude nothing at the query level", async () => {
    const { data } = await me
      .from("events")
      .select("id")
      .eq("state", "published")
      .in("id", [myEventId, attendingEventId, otherEventId]);
    expect(data?.length).toBe(3);
  });
});
