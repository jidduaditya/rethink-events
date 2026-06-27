import { describe, it, expect } from "vitest";
import { eventSchema } from "@/lib/validations/event";

const valid = {
  title: "Intro to AI Agents",
  description: "A session on agent architectures.",
  city: "bangalore",
  venue: "Koramangala Social",
  starts_at: "2026-07-01T10:00:00.000Z",
  ends_at: "2026-07-01T12:00:00.000Z",
  capacity: 40,
  tags: ["ai_pm", "beginner"],
};

describe("eventSchema", () => {
  it("accepts a valid event", () => {
    expect(eventSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty title", () => {
    const r = eventSchema.safeParse({ ...valid, title: "" });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.title).toBeDefined();
  });

  it("rejects a city not in the enum", () => {
    const r = eventSchema.safeParse({ ...valid, city: "mumbai" });
    expect(r.success).toBe(false);
  });

  it("rejects a tag not in the enum", () => {
    const r = eventSchema.safeParse({ ...valid, tags: ["product-teardown"] });
    expect(r.success).toBe(false);
  });

  it("rejects ends_at before starts_at", () => {
    const r = eventSchema.safeParse({
      ...valid,
      ends_at: "2026-07-01T09:00:00.000Z",
    });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.ends_at?.[0]).toMatch(/end/i);
  });

  it("accepts null capacity", () => {
    expect(eventSchema.safeParse({ ...valid, capacity: null }).success).toBe(true);
  });

  it("accepts omitted capacity", () => {
    const { capacity: _c, ...rest } = valid;
    expect(eventSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects zero capacity", () => {
    expect(eventSchema.safeParse({ ...valid, capacity: 0 }).success).toBe(false);
  });

  it("rejects negative capacity", () => {
    expect(eventSchema.safeParse({ ...valid, capacity: -1 }).success).toBe(false);
  });

  it("accepts an empty tags array", () => {
    expect(eventSchema.safeParse({ ...valid, tags: [] }).success).toBe(true);
  });

  it("defaults tags to [] when omitted", () => {
    const { tags: _t, ...rest } = valid;
    const r = eventSchema.safeParse(rest);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tags).toEqual([]);
  });
});
