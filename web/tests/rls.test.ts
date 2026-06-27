/**
 * RLS matrix test — every role × state cell from the plan.
 * This is the shared regression gate: every PR must keep this green.
 *
 * Requires a real Supabase instance (local or hosted) with migrations applied.
 * Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY in web/.env.local before running.
 *
 * Run: npm test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  admin, anon,
  makeUser, userClient, setProfile, wipeUsers,
  type SupabaseClient,
} from "./helpers";

// ─── shared state ───────────────────────────────────────────────────────────
let hostId: string;     // untrusted first
let trustedHostId: string;
let memberId: string;
let adminId: string;
let hostClient: SupabaseClient;
let trustedClient: SupabaseClient;
let memberClient: SupabaseClient;
let adminClient: SupabaseClient;

// event ids by state
const eventIds: Record<string, string> = {};

async function insertEvent(
  hostUid: string,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const base = {
    host_id: hostUid,
    title: "Test Event",
    city: "bangalore",
    starts_at: new Date(Date.now() + 86400_000).toISOString(),
    ends_at:   new Date(Date.now() + 90000_000).toISOString(),
    state: "published",
  };
  const { data, error } = await admin
    .from("events")
    .insert({ ...base, ...overrides })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ─── setup / teardown ───────────────────────────────────────────────────────
beforeAll(async () => {
  await wipeUsers();

  hostId        = await makeUser("host@test.local");
  trustedHostId = await makeUser("trusted@test.local");
  memberId      = await makeUser("member@test.local");
  adminId       = await makeUser("admin@test.local");

  await setProfile(trustedHostId, { is_trusted: true });
  await setProfile(adminId,       { is_admin: true });

  hostClient    = await userClient("host@test.local");
  trustedClient = await userClient("trusted@test.local");
  memberClient  = await userClient("member@test.local");
  adminClient   = await userClient("admin@test.local");

  // Create one event per state via service role (bypass triggers for states
  // that the trigger wouldn't set, like draft).
  eventIds.draft        = await insertEvent(hostId, { state: "draft" });
  eventIds.pending      = await insertEvent(hostId, { state: "pending_review" });
  eventIds.published    = await insertEvent(trustedHostId);
  eventIds.cancelled    = await insertEvent(trustedHostId, { state: "cancelled" });
  eventIds.taken_down   = await insertEvent(trustedHostId, { state: "taken_down" });
}, 60_000);

afterAll(wipeUsers);

// ─── helpers ────────────────────────────────────────────────────────────────
async function canSelect(client: SupabaseClient, id: string): Promise<boolean> {
  const { data } = await client.from("events").select("id").eq("id", id);
  return (data ?? []).length > 0;
}

// ─── events SELECT matrix ───────────────────────────────────────────────────
describe("events SELECT — anon", () => {
  it("cannot see draft",        async () => expect(await canSelect(anon, eventIds.draft)).toBe(false));
  it("cannot see pending",      async () => expect(await canSelect(anon, eventIds.pending)).toBe(false));
  it("can see published",       async () => expect(await canSelect(anon, eventIds.published)).toBe(true));
  it("can see cancelled",       async () => expect(await canSelect(anon, eventIds.cancelled)).toBe(true));
  it("cannot see taken_down",   async () => expect(await canSelect(anon, eventIds.taken_down)).toBe(false));
});

describe("events SELECT — member (not owner, not admin)", () => {
  it("cannot see draft",        async () => expect(await canSelect(memberClient, eventIds.draft)).toBe(false));
  it("cannot see pending",      async () => expect(await canSelect(memberClient, eventIds.pending)).toBe(false));
  it("can see published",       async () => expect(await canSelect(memberClient, eventIds.published)).toBe(true));
  it("can see cancelled",       async () => expect(await canSelect(memberClient, eventIds.cancelled)).toBe(true));
  it("cannot see taken_down",   async () => expect(await canSelect(memberClient, eventIds.taken_down)).toBe(false));
});

describe("events SELECT — host (owner of draft + pending)", () => {
  it("can see own draft",       async () => expect(await canSelect(hostClient, eventIds.draft)).toBe(true));
  it("can see own pending",     async () => expect(await canSelect(hostClient, eventIds.pending)).toBe(true));
  it("can see published",       async () => expect(await canSelect(hostClient, eventIds.published)).toBe(true));
  it("can see cancelled",       async () => expect(await canSelect(hostClient, eventIds.cancelled)).toBe(true));
  it("can see own taken_down",  async () => expect(await canSelect(trustedClient, eventIds.taken_down)).toBe(true));
  it("cannot see other host draft", async () => {
    const otherId = await insertEvent(trustedHostId, { state: "draft" });
    expect(await canSelect(hostClient, otherId)).toBe(false);
    await admin.from("events").delete().eq("id", otherId);
  });
});

describe("events SELECT — admin", () => {
  it("can see draft",           async () => expect(await canSelect(adminClient, eventIds.draft)).toBe(true));
  it("can see pending",         async () => expect(await canSelect(adminClient, eventIds.pending)).toBe(true));
  it("can see published",       async () => expect(await canSelect(adminClient, eventIds.published)).toBe(true));
  it("can see cancelled",       async () => expect(await canSelect(adminClient, eventIds.cancelled)).toBe(true));
  it("can see taken_down",      async () => expect(await canSelect(adminClient, eventIds.taken_down)).toBe(true));
});

// ─── events INSERT + trust-based initial state ───────────────────────────────
describe("events INSERT — initial state trigger", () => {
  it("untrusted host → pending_review", async () => {
    const { data } = await hostClient
      .from("events")
      .insert({
        host_id: hostId, title: "New untrusted", city: "pune",
        starts_at: new Date(Date.now() + 86400_000).toISOString(),
        ends_at:   new Date(Date.now() + 90000_000).toISOString(),
      })
      .select("state").single();
    expect(data?.state).toBe("pending_review");
  });

  it("trusted host → published immediately", async () => {
    const { data } = await trustedClient
      .from("events")
      .insert({
        host_id: trustedHostId, title: "New trusted", city: "delhi",
        starts_at: new Date(Date.now() + 86400_000).toISOString(),
        ends_at:   new Date(Date.now() + 90000_000).toISOString(),
      })
      .select("state").single();
    expect(data?.state).toBe("published");
  });
});

// ─── admin approve flips host to trusted ─────────────────────────────────────
describe("admin approve → trust flip", () => {
  it("approving a pending event flips the host to is_trusted", async () => {
    const newHostId = await makeUser("newhost@test.local");
    await setProfile(newHostId, { is_trusted: false });

    const eid = await insertEvent(newHostId, { state: "pending_review" });
    await admin.from("events").update({ state: "published" }).eq("id", eid);

    const { data } = await admin
      .from("profiles").select("is_trusted").eq("id", newHostId).single();
    expect(data?.is_trusted).toBe(true);
  });
});

// ─── rsvp_to_event — capacity + double-RSVP idempotency ─────────────────────
describe("rsvp_to_event()", () => {
  it("RSVPs successfully to an open event", async () => {
    const { data, error } = await memberClient.rpc("rsvp_to_event", {
      p_event_id: eventIds.published,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("double-RSVP is idempotent (no error, status stays going)", async () => {
    const { error } = await memberClient.rpc("rsvp_to_event", {
      p_event_id: eventIds.published,
    });
    expect(error).toBeNull();
  });

  it("rejects RSVP when event is full", async () => {
    const capId = await insertEvent(trustedHostId, { capacity: 1 });
    // fill it
    await admin.from("rsvps").insert({ event_id: capId, user_id: adminId, status: "going" });
    // member should be rejected
    const { error } = await memberClient.rpc("rsvp_to_event", { p_event_id: capId });
    expect(error?.message).toMatch(/event full/i);
  });

  it("rejects RSVP to a non-published event", async () => {
    const { error } = await memberClient.rpc("rsvp_to_event", {
      p_event_id: eventIds.pending,
    });
    expect(error?.message).toMatch(/event not open/i);
  });
});

// ─── security: review-queue bypass, identity spoofing, host_id reassignment ──
describe("security — fixed vulnerabilities", () => {
  it("untrusted host cannot bypass review queue by sending state=published", async () => {
    const { data } = await hostClient
      .from("events")
      .insert({
        host_id: hostId, title: "Bypass attempt", city: "pune",
        state: "published",  // should be overridden to pending_review
        starts_at: new Date(Date.now() + 86400_000).toISOString(),
        ends_at:   new Date(Date.now() + 90000_000).toISOString(),
      })
      .select("state").single();
    expect(data?.state).toBe("pending_review");
  });

  it("host cannot spoof host_name on insert", async () => {
    const { data } = await trustedClient
      .from("events")
      .insert({
        host_id: trustedHostId, title: "Name spoof attempt", city: "delhi",
        host_name: "Definitely Not Me",  // should be ignored; overwritten from profile
        starts_at: new Date(Date.now() + 86400_000).toISOString(),
        ends_at:   new Date(Date.now() + 90000_000).toISOString(),
      })
      .select("host_name").single();
    expect(data?.host_name).not.toBe("Definitely Not Me");
  });

  it("host cannot reassign event to a different host_id", async () => {
    const eid = await insertEvent(trustedHostId);
    const { error } = await trustedClient
      .from("events")
      .update({ host_id: memberId })
      .eq("id", eid);
    expect(error).toBeTruthy();
  });
});

// ─── profile flag protection ──────────────────────────────────────────────────
describe("profiles — cannot self-elevate", () => {
  it("member cannot set is_trusted on own profile", async () => {
    const { error } = await memberClient
      .from("profiles")
      .update({ is_trusted: true })
      .eq("id", memberId);
    expect(error).toBeTruthy();
  });

  it("member cannot set is_admin on own profile", async () => {
    const { error } = await memberClient
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", memberId);
    expect(error).toBeTruthy();
  });
});

// ─── feedback visibility ──────────────────────────────────────────────────────
describe("feedback — host/admin only", () => {
  let feedbackEventId: string;

  beforeAll(async () => {
    feedbackEventId = eventIds.published;
    // RSVP member first (required for feedback insert)
    await admin.from("rsvps")
      .upsert({ event_id: feedbackEventId, user_id: memberId, status: "going" });
    // Insert feedback as member
    await admin.from("feedback").insert({
      event_id: feedbackEventId, user_id: memberId, thumbs_up: true,
    });
  });

  it("member cannot read another member's feedback", async () => {
    // member2 who didn't leave feedback
    const m2id = await makeUser("member2@test.local");
    const m2 = await userClient("member2@test.local");
    const { data } = await m2.from("feedback").select("id").eq("event_id", feedbackEventId);
    expect((data ?? []).length).toBe(0);
    await admin.auth.admin.deleteUser(m2id);
  });

  it("member can read their own feedback row", async () => {
    const { data } = await memberClient
      .from("feedback").select("id").eq("event_id", feedbackEventId);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("host of event can read feedback", async () => {
    const { data } = await trustedClient
      .from("feedback").select("id").eq("event_id", feedbackEventId);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("admin can read feedback", async () => {
    const { data } = await adminClient
      .from("feedback").select("id").eq("event_id", feedbackEventId);
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
