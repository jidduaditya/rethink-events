"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { EventWithOrganizer } from "@/lib/types";

const PAGE_SIZE = 20;

export function useEvents(filters?: {
  city?: string;
  format?: "all" | "online" | "offline";
}) {
  const supabase = createClient();

  return useInfiniteQuery<EventWithOrganizer[]>({
    queryKey: [
      "events",
      "feed",
      filters?.city ?? "all",
      filters?.format ?? "all",
    ],
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("events")
        .select("*, organizer:profiles!created_by(id, full_name, email)")
        .eq("status", "approved")
        .gt("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(PAGE_SIZE);

      if (filters?.city && filters.city !== "all") {
        query = query.eq("city", filters.city);
      }

      if (filters?.format && filters.format !== "all") {
        query = query.eq("event_type", filters.format);
      }

      if (pageParam) {
        query = query.gt("starts_at", pageParam as string);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EventWithOrganizer[];
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].starts_at;
    },
  });
}
