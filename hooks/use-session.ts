"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useSession() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      return session;
    },
    staleTime: 5 * 60 * 1000,
  });
}
