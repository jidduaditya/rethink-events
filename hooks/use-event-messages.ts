"use client";

// useEventMessages: fetch messages for an event
//   Query key: ["messages", eventId]
//   Returns messages newest-first (server orders by created_at desc via the index).
//
// useSendMessage: mutation to insert a message into event_messages
//   Invalidates: ["messages", eventId]
//   Email fan-out is handled server-side by the integration agent (API route or
//   server action that reads recipients and calls lib/email.ts after insert).
//
//   Rate limit: caller should consume `cooldownSeconds` and disable the send
//   button while > 0. The hook decrements it every second via setInterval.

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Defined inline — do NOT add to lib/types.ts (integration agent handles that).
type EventMessage = {
  id: string;
  event_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const COOLDOWN_SECONDS = 60;

export function useEventMessages(eventId: string) {
  const supabase = createClient();

  return useQuery<EventMessage[]>({
    queryKey: ["messages", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_messages")
        .select("id, event_id, sender_id, body, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as EventMessage[];
    },
    enabled: !!eventId,
  });
}

export function useSendMessage(eventId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Countdown timer — decrements every second while cooldown is active.
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const id = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [cooldownSeconds]);

  const startCooldown = useCallback(() => {
    setCooldownSeconds(COOLDOWN_SECONDS);
  }, []);

  const mutation = useMutation({
    mutationFn: async (body: string) => {
      // Caller must be the event creator — RLS enforces this server-side.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("event_messages")
        .insert({
          event_id: eventId,
          sender_id: user.id,
          body,
        })
        .select("id, event_id, sender_id, body, created_at")
        .single();

      if (error) throw error;
      return data as EventMessage;
    },
    onSuccess: () => {
      // Invalidation map (§6 of events-v1-plan.md):
      //   send update → ["messages", eventId]
      queryClient.invalidateQueries({ queryKey: ["messages", eventId] });
      startCooldown();
    },
  });

  return {
    sendMessage: mutation.mutate,
    isSending: mutation.isPending,
    sendError: mutation.error,
    cooldownSeconds,
    isOnCooldown: cooldownSeconds > 0,
  };
}
