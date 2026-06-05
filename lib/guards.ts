import { createClient } from "@/lib/supabase/client";
import type { Profile, Event } from "@/lib/types";

/**
 * Check session validity. Returns user or null.
 * Use in mutation hooks before executing.
 */
export async function requireAuth() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?returnTo=${returnTo}`;
    return null;
  }

  return session.user;
}

/**
 * Check if the current user is an admin.
 */
export function requireAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

/**
 * Check if an event is approved and eligible for RSVP.
 */
export function requireApprovedEvent(
  event: Event | null | undefined
): boolean {
  return event?.status === "approved";
}

/**
 * Check if an event is in the future.
 */
export function isUpcoming(event: Event | null | undefined): boolean {
  if (!event) return false;
  return new Date(event.starts_at) > new Date();
}

/**
 * Check time overlap between two events.
 * Boundary-sharing events do NOT conflict (end === start is ok).
 */
export function hasTimeOverlap(
  a: { starts_at: string; ends_at: string },
  b: { starts_at: string; ends_at: string }
): boolean {
  const aStart = new Date(a.starts_at).getTime();
  const aEnd = new Date(a.ends_at).getTime();
  const bStart = new Date(b.starts_at).getTime();
  const bEnd = new Date(b.ends_at).getTime();
  return aStart < bEnd && aEnd > bStart;
}
