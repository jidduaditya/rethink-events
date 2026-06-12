"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requireAuth, requireApprovedEvent, isUpcoming } from "@/lib/guards";
import type { Event, RegistrationWithEvent, CreateRegistrationResult } from "@/lib/types";

type RegistrationAction = {
  eventId: string;
  userId: string;
};

type EventDetailCache = {
  event: Event & { organizer: { id: string; full_name: string; email: string } };
  attendeeCount: number;
};

export function useRegistration(event: Event | undefined, userId: string | undefined, userRegistrations: RegistrationWithEvent[] | undefined) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const rsvp = useMutation({
    mutationFn: async ({ eventId, userId: uid }: RegistrationAction) => {
      const user = await requireAuth();
      if (!user) throw new Error("Not authenticated");

      if (!requireApprovedEvent(event)) {
        throw new Error("Event is not approved");
      }

      if (!isUpcoming(event)) {
        throw new Error("Event has already passed");
      }

      const { data, error } = await supabase.rpc("create_registration", {
        p_user_id: uid,
        p_event_id: eventId,
      });

      if (error) throw error;

      const result = data as unknown as CreateRegistrationResult;
      if (!result.success) throw new Error(result.reason ?? "Registration failed");

      return result;
    },
    onSuccess: (result) => {
      if (result?.code) {
        router.push(`/t/${result.code}`);
      }
    },
    onMutate: async ({ eventId, userId: uid }) => {
      await queryClient.cancelQueries({ queryKey: ["event", eventId] });
      await queryClient.cancelQueries({ queryKey: ["registrations", uid] });

      const previousEvent = queryClient.getQueryData<EventDetailCache>(["event", eventId]);
      const previousRegistrations = queryClient.getQueryData<RegistrationWithEvent[]>(["registrations", uid]);

      if (previousEvent) {
        queryClient.setQueryData<EventDetailCache>(["event", eventId], {
          ...previousEvent,
          attendeeCount: previousEvent.attendeeCount + 1,
        });
      }

      return { previousEvent, previousRegistrations };
    },
    onError: (_err, { eventId, userId: uid }, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(["event", eventId], context.previousEvent);
      }
      if (context?.previousRegistrations) {
        queryClient.setQueryData(["registrations", uid], context.previousRegistrations);
      }
    },
    onSettled: (_data, _err, { eventId, userId: uid }) => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["registrations", uid] });
      queryClient.invalidateQueries({ queryKey: ["events", "feed"] });
    },
  });

  const cancel = useMutation({
    mutationFn: async ({ eventId, userId: uid }: RegistrationAction) => {
      const user = await requireAuth();
      if (!user) throw new Error("Not authenticated");

      // Find the active registration for this event.
      const reg = userRegistrations?.find(
        (r) => r.event_id === eventId && r.status !== "cancelled"
      );
      if (!reg) throw new Error("No active registration found");

      const { data, error } = await supabase.rpc("cancel_my_registration", {
        p_registration_id: reg.id,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; reason?: string };
      if (!result.success) throw new Error(result.reason ?? "Cancellation failed");
    },
    onMutate: async ({ eventId, userId: uid }) => {
      await queryClient.cancelQueries({ queryKey: ["event", eventId] });
      await queryClient.cancelQueries({ queryKey: ["registrations", uid] });

      const previousEvent = queryClient.getQueryData<EventDetailCache>(["event", eventId]);
      const previousRegistrations = queryClient.getQueryData<RegistrationWithEvent[]>(["registrations", uid]);

      if (previousEvent) {
        queryClient.setQueryData<EventDetailCache>(["event", eventId], {
          ...previousEvent,
          attendeeCount: Math.max(0, previousEvent.attendeeCount - 1),
        });
      }

      return { previousEvent, previousRegistrations };
    },
    onError: (_err, { eventId, userId: uid }, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(["event", eventId], context.previousEvent);
      }
      if (context?.previousRegistrations) {
        queryClient.setQueryData(["registrations", uid], context.previousRegistrations);
      }
    },
    onSettled: (_data, _err, { eventId, userId: uid }) => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["registrations", uid] });
      queryClient.invalidateQueries({ queryKey: ["events", "feed"] });
    },
  });

  return {
    rsvp: (eventId: string) => {
      if (!userId) return;
      rsvp.mutate({ eventId, userId });
    },
    cancel: (eventId: string) => {
      if (!userId) return;
      cancel.mutate({ eventId, userId });
    },
    isRsvping: rsvp.isPending || cancel.isPending,
  };
}
