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

  describe("when: 'today'", () => {
    // `matchesFilters` computes the "today" boundary with local-time
    // setHours(23,59,59,999). Use a `now` and same-day `starts_at` only a few
    // minutes apart so the assertion holds regardless of the runner's timezone,
    // and a clearly-far-future event for the failing case.
    const now = new Date("2030-06-10T12:00:00Z");
    it("passes an event later today", () => {
      const later = {
        ...base,
        starts_at: "2030-06-10T12:30:00Z",
      } satisfies Pick<Event, "starts_at" | "ends_at" | "city" | "event_type">;
      expect(matchesFilters(later, { ...ALL, when: "today" }, now)).toBe(true);
    });
    it("fails an event tomorrow", () => {
      // Far enough into the next UTC day that end-of-local-today never reaches it.
      const tomorrow = {
        ...base,
        starts_at: "2030-06-12T00:00:00Z",
      } satisfies Pick<Event, "starts_at" | "ends_at" | "city" | "event_type">;
      expect(matchesFilters(tomorrow, { ...ALL, when: "today" }, now)).toBe(false);
    });
  });

  describe("when: 'week'", () => {
    const now = new Date("2030-06-10T08:00:00Z");
    it("passes an event 3 days out", () => {
      const threeDays = {
        ...base,
        starts_at: "2030-06-13T08:00:00Z",
      } satisfies Pick<Event, "starts_at" | "ends_at" | "city" | "event_type">;
      expect(matchesFilters(threeDays, { ...ALL, when: "week" }, now)).toBe(true);
    });
    it("fails an event 10 days out", () => {
      const tenDays = {
        ...base,
        starts_at: "2030-06-20T08:00:00Z",
      } satisfies Pick<Event, "starts_at" | "ends_at" | "city" | "event_type">;
      expect(matchesFilters(tenDays, { ...ALL, when: "week" }, now)).toBe(false);
    });
  });

  describe("null city", () => {
    const noCity = {
      ...base,
      city: null,
    } satisfies Pick<Event, "starts_at" | "ends_at" | "city" | "event_type">;
    it("fails when a specific city filter is set", () => {
      expect(matchesFilters(noCity, { ...ALL, city: "Bangalore" }, new Date())).toBe(false);
    });
    it("passes when the city filter is 'all'", () => {
      expect(matchesFilters(noCity, { ...ALL, city: "all" }, new Date())).toBe(true);
    });
  });
});

describe("isLive", () => {
  it("true when now is between start and end", () => {
    expect(isLive(base, new Date("2030-06-10T10:30:00Z"))).toBe(true);
  });
  it("false before start", () => {
    expect(isLive(base, new Date("2030-06-10T09:00:00Z"))).toBe(false);
  });
  it("false exactly at ends_at (strict >)", () => {
    expect(isLive(base, new Date("2030-06-10T11:00:00Z"))).toBe(false);
  });
  it("true exactly at starts_at (<=)", () => {
    expect(isLive(base, new Date("2030-06-10T10:00:00Z"))).toBe(true);
  });
});
