"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { EventWithOrganizer } from "@/lib/types";

type EventDetail = {
  event: EventWithOrganizer;
  attendeeCount: number;
};

export function useEvent(eventId: string | undefined) {
  const supabase = createClient();

  return useQuery<EventDetail | null>({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const [eventResult, countResult] = await Promise.all([
        supabase
          .from("events")
          .select("*, organizer:profiles!created_by(id, full_name, email)")
          .eq("id", eventId!)
          .single(),
        // Count only native registrations to match capacity enforcement in create_registration.
        supabase
          .from("registrations")
          .select("id", { count: "exact", head: true })
          .eq("event_id", eventId!)
          .eq("kind", "native"),
      ]);

      if (eventResult.error) throw eventResult.error;
      if (countResult.error) throw countResult.error;

      return {
        event: eventResult.data as EventWithOrganizer,
        attendeeCount: countResult.count ?? 0,
      };
    },
    enabled: !!eventId,
  });
}
