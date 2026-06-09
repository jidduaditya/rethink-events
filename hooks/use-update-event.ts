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

      // Keep register_url consistent with the check constraint:
      // native events must store null, external events keep their URL.
      const normalized =
        updates.register_mode !== undefined
          ? {
              ...updates,
              register_url:
                updates.register_mode === "external"
                  ? updates.register_url ?? null
                  : null,
            }
          : updates;

      const { data, error } = await supabase
        .from("events")
        .update(normalized)
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
