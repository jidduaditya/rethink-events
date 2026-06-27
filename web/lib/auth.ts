import { createClient } from "@/lib/supabase/server";

// ponytail: inline until `supabase gen types` runs (needs DB keys)
type MinProfile = {
  id: string;
  is_admin: boolean;
  is_trusted: boolean;
  full_name: string | null;
  goal: string | null;
  level: string | null;
  city: string | null;
};

export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

export async function requireAuth(): Promise<{
  userId: string;
  profile: MinProfile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AuthError("UNAUTHORIZED");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_admin, is_trusted, full_name, goal, level, city")
    .eq("id", user.id)
    .single();

  if (!profile) throw new AuthError("UNAUTHORIZED");

  return { userId: user.id, profile, supabase };
}

export async function requireAdmin() {
  const result = await requireAuth();
  if (!result.profile.is_admin) throw new AuthError("FORBIDDEN");
  return result;
}

export async function requireOwner(eventId: string) {
  const { userId, profile, supabase } = await requireAuth();
  const { data: event } = await supabase
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();
  if (!event || event.host_id !== userId) throw new AuthError("FORBIDDEN");
  return { userId, profile };
}
