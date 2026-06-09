"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { requireAuth, requireApprovedEvent, isUpcoming, hasTimeOverlap } from "@/lib/guards";
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

      // Conflict and capacity pre-checks only run for native registration mode
      if (event?.register_mode === "native") {
        if (event && userRegistrations) {
          const conflict = userRegistrations.find((r) =>
            r.event_id !== eventId && hasTimeOverlap(r.event, event)
          );
          if (conflict) {
            throw new Error(`Time conflict with "${conflict.event.title}"`);
          }
        }

        if (event?.capacity) {
          const cached = queryClient.getQueryData<EventDetailCache>(["event", eventId]);
          if (cached && cached.attendeeCount >= event.capacity) {
            throw new Error("Event is full");
          }
        }
      }

      const { data, error } = await supabase.rpc("create_registration", {
        p_user_id: uid,
        p_event_id: eventId,
      });

      if (error) throw error;

      const result = data as unknown as CreateRegistrationResult;
      if (!result.success) throw new Error(result.reason ?? "Registration failed");
      if (result.kind === "external" && event?.register_url) {
        window.open(event.register_url, "_blank", "noopener,noreferrer");
      }

      return result;
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

      const { error } = await supabase
        .from("registrations")
        .delete()
        .eq("user_id", uid)
        .eq("event_id", eventId);

      if (error) throw error;
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
