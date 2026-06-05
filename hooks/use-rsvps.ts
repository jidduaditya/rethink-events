"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RsvpWithEvent } from "@/lib/types";

export function useRsvps(userId: string | undefined) {
  const supabase = createClient();

  return useQuery<RsvpWithEvent[]>({
    queryKey: ["rsvps", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rsvps")
        .select("*, event:events(*)")
        .eq("user_id", userId!);

      if (error) throw error;
      return data as RsvpWithEvent[];
    },
    enabled: !!userId,
  });
}
