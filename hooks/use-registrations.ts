"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RegistrationWithEvent } from "@/lib/types";

export function useRegistrations(userId: string | undefined) {
  const supabase = createClient();
  return useQuery<RegistrationWithEvent[]>({
    queryKey: ["registrations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, event:events(*)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data as RegistrationWithEvent[];
    },
    enabled: !!userId,
  });
}
