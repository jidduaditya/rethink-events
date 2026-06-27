import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !anonKey || !serviceKey) {
  throw new Error(
    "RLS tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, " +
    "and SUPABASE_SERVICE_ROLE_KEY in web/.env.local"
  );
}

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client — bypasses RLS, used for setup/teardown only. */
export const admin: SupabaseClient = createClient(url, serviceKey, noPersist);

/** Anonymous (logged-out) client. */
export const anon: SupabaseClient = createClient(url, anonKey, noPersist);

const PW = "Test-password-1!";

/** Create a confirmed auth user; the trigger auto-creates the profile row. Returns user id.
 *  Uses upsert semantics: updates password/confirmation if the user already exists. */
export async function makeUser(email: string): Promise<string> {
  // Try creating first (fast path for clean runs).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
  });
  if (!error) return data.user!.id;

  // Already exists (stale from a prior crashed run) — fetch and return the id.
  // Supabase soft-deletes don't free the email immediately, so we reuse it.
  if (error.message.includes("already been registered")) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users.find((u) => u.email === email);
    if (existing) return existing.id;
  }
  throw error;
}

/** Authenticated supabase client for the given user. */
export async function userClient(email: string): Promise<SupabaseClient> {
  const c = createClient(url, anonKey, noPersist);
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw error;
  return c;
}

/** Patch profile fields via service role (bypasses the protect_profile_flags trigger). */
export async function setProfile(id: string, fields: Record<string, unknown>) {
  const { error } = await admin.from("profiles").update(fields).eq("id", id);
  if (error) throw error;
}

/** Delete all test auth users (cascades to profiles/events/rsvps/feedback). */
export async function wipeUsers() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    await admin.auth.admin.deleteUser(u.id);
  }
}
