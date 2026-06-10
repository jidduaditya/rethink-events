import type { Event } from "@/lib/types";

export type FeedFilters = {
  city: string; // "all" or a city name
  format: "all" | "online" | "offline";
  when: "all" | "today" | "week";
};

export function isLive(e: Pick<Event, "starts_at" | "ends_at">, now: Date): boolean {
  return new Date(e.starts_at) <= now && new Date(e.ends_at) > now;
}

export function matchesFilters(
  e: Pick<Event, "city" | "event_type" | "starts_at">,
  f: FeedFilters,
  now: Date
): boolean {
  if (f.city !== "all" && (e.city ?? "") !== f.city) return false;
  if (f.format !== "all" && e.event_type !== f.format) return false;
  if (f.when !== "all") {
    const start = new Date(e.starts_at);
    const end = new Date(now);
    if (f.when === "today") end.setHours(23, 59, 59, 999);
    if (f.when === "week") end.setDate(end.getDate() + 7);
    if (start > end) return false;
  }
  return true;
}
