"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type Attendee = {
  id: string;
  user: { full_name: string; email: string };
};

export function useEventAttendees(eventId: string) {
  const supabase = createClient();
  return useQuery<Attendee[]>({
    queryKey: ["attendees", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, user:profiles!user_id(full_name, email)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data as unknown as Attendee[];
    },
  });
}

export function useRemoveAttendee(eventId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from("registrations")
        .delete()
        .eq("id", registrationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendees", eventId] }),
  });
}
