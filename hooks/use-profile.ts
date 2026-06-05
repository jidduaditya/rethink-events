"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function useProfile(userId: string | undefined) {
  const supabase = createClient();

  return useQuery<Profile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
