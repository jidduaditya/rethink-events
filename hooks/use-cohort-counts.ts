"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProfileGoal, ProfileLevel } from "@/lib/types";

type CohortProfile = {
  goal: ProfileGoal | null;
  level: ProfileLevel | null;
  city: string | null;
};

export function useCohortCounts(eventIds: string[], profile: CohortProfile) {
  const supabase = createClient();

  return useQuery<Record<string, number>>({
    queryKey: [
      "cohort-counts",
      [...eventIds].sort().join(","),
      profile.goal,
      profile.level,
      profile.city,
    ],
    enabled:
      eventIds.length > 0 &&
      !!profile.goal &&
      !!profile.level &&
      !!profile.city,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cohort_counts", {
        p_event_ids: eventIds,
        p_goal: profile.goal,
        p_level: profile.level,
        p_city: profile.city,
      });
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.event_id] = Number(row.cohort_count);
      }
      return counts;
    },
  });
}
