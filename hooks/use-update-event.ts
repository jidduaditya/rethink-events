"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { requireAuth } from "@/lib/guards";
import type { Event } from "@/lib/types";

type UpdateEventInput = {
  eventId: string;
  updates: Partial<Omit<Event, "id" | "created_at" | "created_by">>;
};

export function useUpdateEvent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ eventId, updates }: UpdateEventInput) => {
      const user = await requireAuth();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventId)
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["event", data.id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  return {
    updateEvent: mutation.mutate,
    isUpdating: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
}
