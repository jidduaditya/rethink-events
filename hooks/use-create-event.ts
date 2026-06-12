"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { requireAuth } from "@/lib/guards";
import type { Event, RegisterMode } from "@/lib/types";

type CreateEventInput = Omit<
  Event,
  | "id"
  | "created_at"
  | "status"
  | "created_by"
  | "register_mode"
  | "cancelled_at"
  | "cancellation_reason"
  | "reminder_sent_at"
> & {
  register_mode: RegisterMode;
};

export function useCreateEvent() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const user = await requireAuth();
      if (!user) throw new Error("Not authenticated");

      const register_mode = input.register_mode ?? "native";

      // Status is set server-side by the before-insert trigger based on
      // whether the creator is a trusted host or admin. Do not hardcode here.
      const { data, error } = await supabase
        .from("events")
        .insert({
          ...input,
          register_mode,
          register_url: register_mode === "external" ? input.register_url ?? null : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: (event) => {
      // Invalidates: ["events","feed"] (new approved event appears) or
      //              ["admin","queue"] (new pending event queued for review).
      queryClient.invalidateQueries({ queryKey: ["events"] });
      if (event.status === "pending") {
        queryClient.invalidateQueries({ queryKey: ["admin", "queue"] });
      }
    },
  });

  return {
    createEvent: mutation.mutate,
    createEventAsync: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
}
