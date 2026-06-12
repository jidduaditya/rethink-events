"use client";

// useCancelRegistration — calls cancel_my_registration(registration_id) RPC.
//
// Invalidation map (per plan §6):
//   cancel my registration  ["event",eventId], ["attendees",eventId],
//                           ["registrations","me"], ["events","feed"],
//                           ["ticket",code]

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type CancelRegistrationArgs = {
  registrationId: string;
  eventId: string;
  code: string;
};

type CancelRegistrationResult = {
  success: boolean;
  reason?: string;
  promoted?: {
    id: string;
    user_id: string;
    registration_code: string;
  } | null;
};

export function useCancelRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      registrationId,
    }: CancelRegistrationArgs): Promise<CancelRegistrationResult> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "cancel_my_registration",
        { p_registration_id: registrationId }
      );

      if (error) throw error;

      const result = data as unknown as CancelRegistrationResult;
      if (!result?.success) {
        throw new Error(result?.reason ?? "Cancellation failed");
      }

      return result;
    },
    onSettled: (_data, _err, { eventId, code }) => {
      // Invalidation map: cancel my registration
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["attendees", eventId] });
      queryClient.invalidateQueries({ queryKey: ["registrations", "me"] });
      queryClient.invalidateQueries({ queryKey: ["events", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", code] });
    },
  });
}
