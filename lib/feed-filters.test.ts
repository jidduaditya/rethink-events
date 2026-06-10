import { describe, it, expect } from "vitest";
import { matchesFilters, isLive, type FeedFilters } from "@/lib/feed-filters";
import type { Event } from "@/lib/types";

const base = {
  starts_at: "2030-06-10T10:00:00Z",
  ends_at: "2030-06-10T11:00:00Z",
  city: "Bangalore",
  event_type: "offline",
} satisfies Pick<Event, "starts_at" | "ends_at" | "city" | "event_type">;

const ALL: FeedFilters = { city: "all", format: "all", when: "all" };

describe("matchesFilters", () => {
  it("passes when all filters are 'all'", () => {
    expect(matchesFilters(base, ALL, new Date("2030-06-01T00:00:00Z"))).toBe(true);
  });
  it("filters by city", () => {
    expect(matchesFilters(base, { ...ALL, city: "Mumbai" }, new Date())).toBe(false);
  });
  it("filters by format", () => {
    expect(matchesFilters(base, { ...ALL, format: "online" }, new Date())).toBe(false);
  });
});

describe("isLive", () => {
  it("true when now is between start and end", () => {
    expect(isLive(base, new Date("2030-06-10T10:30:00Z"))).toBe(true);
  });
  it("false before start", () => {
    expect(isLive(base, new Date("2030-06-10T09:00:00Z"))).toBe(false);
  });
});
