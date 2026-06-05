"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { EventStatus, EventWithOrganizer } from "@/lib/types";

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
        supabase
          .from("events")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true }),
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
    queryKey: ["admin", "pending"],
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
      const { data, error } = await supabase
        .from("events")
        .update({ status })
        .eq("id", eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
