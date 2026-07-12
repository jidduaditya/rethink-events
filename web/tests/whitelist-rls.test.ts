/**
 * Phase 4 — host_whitelist: the ONLY write path for profiles.is_trusted.
 * Requires a real Supabase instance with migrations 0001-0006 applied.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { admin, anon, makeUser, userClient, setProfile, wipeUsers } from "./helpers";

let adminId: string;
let memberId: string;
let adminClient: Awaited<ReturnType<typeof userClient>>;
let memberClient: Awaited<ReturnType<typeof userClient>>;

const MEMBER_EMAIL = "wl-member@test.local";

beforeAll(async () => {
  await wipeUsers();
  await admin.from("host_whitelist").delete().neq("email", "");
  adminId = await makeUser("wl-admin@test.local");
  await setProfile(adminId, { is_admin: true });
  memberId = await makeUser(MEMBER_EMAIL);
  adminClient = await userClient("wl-admin@test.local");
  memberClient = await userClient(MEMBER_EMAIL);
}, 60_000);

afterAll(async () => {
  await admin.from("host_whitelist").delete().neq("email", "");
  await wipeUsers();
});

describe("host_whitelist — access control", () => {
  it("anon cannot read the whitelist", async () => {
    const { data } = await anon.from("host_whitelist").select("email");
    expect(data ?? []).toHaveLength(0);
  });

  it("member cannot read the whitelist", async () => {
    const { data } = await memberClient.from("host_whitelist").select("email");
    expect(data ?? []).toHaveLength(0);
  });

  it("member cannot add themselves", async () => {
    const { error } = await memberClient
      .from("host_whitelist")
      .insert({ email: MEMBER_EMAIL, added_by: memberId });
    expect(error).not.toBeNull();
  });
});

describe("host_whitelist — grant and revoke flip is_trusted", () => {
  it("admin whitelists an existing member -> member becomes trusted", async () => {
    const { error } = await adminClient
      .from("host_whitelist")
      .insert({ email: MEMBER_EMAIL, added_by: adminId });
    expect(error).toBeNull();

    const { data } = await admin
      .from("profiles").select("is_trusted").eq("id", memberId).single();
    expect(data?.is_trusted).toBe(true);
  });

  it("removing the email revokes trust", async () => {
    await adminClient.from("host_whitelist").delete().eq("email", MEMBER_EMAIL);
    const { data } = await admin
      .from("profiles").select("is_trusted").eq("id", memberId).single();
    expect(data?.is_trusted).toBe(false);
  });

  it("pre-approved email -> profile is trusted at signup", async () => {
    await adminClient
      .from("host_whitelist")
      .insert({ email: "wl-early@test.local", added_by: adminId });
    const earlyId = await makeUser("wl-early@test.local");
    const { data } = await admin
      .from("profiles").select("is_trusted").eq("id", earlyId).single();
    expect(data?.is_trusted).toBe(true);
    await adminClient.from("host_whitelist").delete().eq("email", "wl-early@test.local");
  });

  it("emails are matched case-insensitively (stored lowercase)", async () => {
    const { error } = await adminClient
      .from("host_whitelist")
      .insert({ email: "WL-CASED@test.local", added_by: adminId });
    // check constraint requires lowercase; the app lowercases before insert,
    // so an uppercase insert must be rejected at the DB boundary
    expect(error).not.toBeNull();
  });
});

describe("events INSERT — trusted only", () => {
  it("untrusted member cannot create an event at all", async () => {
    const { error } = await memberClient.from("events").insert({
      host_id: memberId, title: "Should fail", city: "pune",
      starts_at: new Date(Date.now() + 86400_000).toISOString(),
      ends_at:   new Date(Date.now() + 90000_000).toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("whitelisted member creates -> published instantly", async () => {
    await adminClient
      .from("host_whitelist")
      .insert({ email: MEMBER_EMAIL, added_by: adminId });

    const { data, error } = await memberClient.from("events").insert({
      host_id: memberId, title: "Whitelisted event", city: "pune",
      starts_at: new Date(Date.now() + 86400_000).toISOString(),
      ends_at:   new Date(Date.now() + 90000_000).toISOString(),
    }).select("state").single();

    expect(error).toBeNull();
    expect(data?.state).toBe("published");
  });
});
