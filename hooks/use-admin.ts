"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { EventStatus, EventWithOrganizer, Profile } from "@/lib/types";

const PAGE_SIZE = 20;

type AdminStats = {
  totalEvents: number;
  totalMembers: number;
  pendingCount: number;
};

export function useAdminStats() {
  const supabase = createClient();

  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [eventsResult, membersResult, pendingResult] = await Promise.all([
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (membersResult.error) throw membersResult.error;
      if (pendingResult.error) throw pendingResult.error;

      return {
        totalEvents: eventsResult.count ?? 0,
        totalMembers: membersResult.count ?? 0,
        pendingCount: pendingResult.count ?? 0,
      };
    },
  });
}

export function useAdminPendingEvents() {
  const supabase = createClient();

  return useInfiniteQuery<EventWithOrganizer[]>({
    queryKey: ["admin", "queue"],
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("events")
        .select("*, organizer:profiles!created_by(id, full_name, email)")
        .in("status", ["pending", "rejected"])
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        query = query.lt("created_at", pageParam as string);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EventWithOrganizer[];
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
  });
}

export function useAdminAction() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string;
      status: EventStatus;
    }) => {
      if (status === "approved") {
        // Invalidates: ["admin","queue"], ["events","feed"], ["event",id], ["admin","users"]
        // Use RPC to atomically approve + set creator as trusted host.
        const { data, error } = await supabase.rpc("approve_event", {
          p_event_id: eventId,
        });
        if (error) throw error;
        if (!data.success) throw new Error(data.reason ?? "Approval failed");
        return data;
      } else {
        // Invalidates: ["admin","queue"], ["events","feed"], ["event",id]
        const { data, error } = await supabase
          .from("events")
          .update({ status })
          .eq("id", eventId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      if (status === "approved") {
        // Trust flag changed on the creator's profile.
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      }
    },
  });
}

export function useAdminUsers() {
  const supabase = createClient();

  return useQuery<Profile[]>({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useTrustToggle() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      trusted,
    }: {
      userId: string;
      trusted: boolean;
    }) => {
      // Invalidates: ["admin","users"]
      const { data, error } = await supabase.rpc("set_trusted_host", {
        p_user_id: userId,
        p_trusted: trusted,
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.reason ?? "Trust update failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
