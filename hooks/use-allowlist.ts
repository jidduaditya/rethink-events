"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AllowlistEntry } from "@/lib/types";

export function useAllowlist() {
  const supabase = createClient();
  return useQuery<AllowlistEntry[]>({
    queryKey: ["allowlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowlist")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AllowlistEntry[];
    },
  });
}

export function useAllowlistMutations() {
  const supabase = createClient();
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: async (emails: string[]) => {
      const rows = emails.map((email) => ({ email, source: "manual" as const }));
      const { error } = await supabase
        .from("allowlist")
        .upsert(rows, { onConflict: "email", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allowlist"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("allowlist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allowlist"] }),
  });

  return { add, remove };
}
