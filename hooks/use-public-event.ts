"use client";

// Query key: ["event", id, "public"]
// Calls the get_public_event security-definer RPC.
// Works for both anon and authenticated callers.

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Inline type for the jsonb returned by get_public_event().
// Integration agent will reconcile this with lib/types.ts in the next step.
export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  event_type: "online" | "offline";
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number | null;
  city: string | null;
  location_name: string | null;
  location_address: string | null;
  meet_url: string | null;
  image_url: string | null;
  speaker_name: string | null;
  speaker_bio: string | null;
  speaker_photo_url: string | null;
  register_mode: string | null;
  status: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by: string;
  host_name: string;
  confirmed_count: number;
};

export function usePublicEvent(eventId: string | undefined) {
  const supabase = createClient();

  return useQuery<PublicEvent | null>({
    // Canonical key from plan §6 query key registry
    queryKey: ["event", eventId, "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_public_event", { p_event_id: eventId! });

      if (error) throw error;

      // RPC returns null for non-approved or missing events
      return (data as PublicEvent) ?? null;
    },
    enabled: !!eventId,
  });
}
