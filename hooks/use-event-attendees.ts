"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type Attendee = {
  id: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  registration_code: string;
  checked_in_at: string | null;
  user: { full_name: string; email: string };
};

export function useEventAttendees(eventId: string) {
  const supabase = createClient();
  return useQuery<Attendee[]>({
    queryKey: ["attendees", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, status, registration_code, checked_in_at, user:profiles!user_id(full_name, email)")
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
      const { data, error } = await supabase.rpc("host_remove_registration", {
        p_registration_id: registrationId,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; reason?: string };
      if (!result.success) throw new Error(result.reason ?? "Removal failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendees", eventId] });
      qc.invalidateQueries({ queryKey: ["event", eventId] });
      qc.invalidateQueries({ queryKey: ["events", "feed"] });
    },
  });
}

export function useCheckIn(eventId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ registrationId, checkedIn }: { registrationId: string; checkedIn: boolean }) => {
      const { data, error } = await supabase.rpc("set_check_in", {
        p_registration_id: registrationId,
        p_checked_in: checkedIn,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; reason?: string };
      if (!result.success) throw new Error(result.reason ?? "Check-in failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendees", eventId] });
    },
  });
}
