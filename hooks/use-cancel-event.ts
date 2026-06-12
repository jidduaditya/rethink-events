"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useCancelEvent(eventId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason: string) => {
      // Invalidates: ["event",id], ["events","feed"], ["attendees",id], ["registrations","me"]
      const { data, error } = await supabase.rpc("cancel_event", {
        p_event_id: eventId,
        p_reason: reason,
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.reason ?? "Cancel failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["attendees", eventId] });
      queryClient.invalidateQueries({ queryKey: ["registrations", "me"] });
    },
  });
}
