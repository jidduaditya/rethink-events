"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProfileGoal, ProfileLevel } from "@/lib/types";

type FeaturedForInput = {
  featured_for_goal:  ProfileGoal | null;
  featured_for_level: ProfileLevel | null;
  featured_for_city:  string | null;
};

export function useFeatureEvent(eventId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FeaturedForInput) => {
      const { error } = await supabase
        .from("events")
        .update(input)
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Cache invalidation: ["event", eventId] (detail page), ["events"] (feed).
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
