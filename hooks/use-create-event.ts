"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { requireAuth } from "@/lib/guards";
import type { Event, RegisterMode } from "@/lib/types";

type CreateEventInput = Omit<
  Event,
  "id" | "created_at" | "status" | "created_by" | "register_mode"
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

      const { data, error } = await supabase
        .from("events")
        .insert({
          ...input,
          register_mode,
          register_url: register_mode === "external" ? input.register_url ?? null : null,
          created_by: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  return {
    createEvent: mutation.mutate,
    isCreating: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
}
