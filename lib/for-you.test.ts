import { describe, it, expect } from "vitest";
import { isForYou } from "@/lib/for-you";
import type { Event, Profile } from "@/lib/types";

type MinEvent = Pick<Event, "tag" | "featured_for_goal" | "featured_for_level" | "featured_for_city">;
type MinProfile = Pick<Profile, "goal" | "level" | "city">;

const noFeatured: MinEvent = {
  tag: null,
  featured_for_goal: null,
  featured_for_level: null,
  featured_for_city: null,
};

const profile: MinProfile = {
  goal: "ai_pm",
  level: "mid",
  city: "Bangalore",
};

describe("isForYou — tag matching", () => {
  it("returns true when event tag matches goal tags", () => {
    expect(isForYou({ ...noFeatured, tag: "ai-pm" }, profile)).toBe(true);
  });

  it("returns true when event tag matches level tags", () => {
    // mid level → ['build', 'ai-pm']
    expect(isForYou({ ...noFeatured, tag: "build" }, profile)).toBe(true);
  });

  it("returns false when event tag does not match goal or level", () => {
    expect(isForYou({ ...noFeatured, tag: "beginner" }, profile)).toBe(false);
  });

  it("returns false when event has no tag and no featured_for", () => {
    expect(isForYou(noFeatured, profile)).toBe(false);
  });
});

describe("isForYou — admin featured match", () => {
  const featured: MinEvent = {
    tag: null,
    featured_for_goal: "ai_pm",
    featured_for_level: "mid",
    featured_for_city: "Bangalore",
  };

  it("returns true when all three featured_for fields match profile", () => {
    expect(isForYou(featured, profile)).toBe(true);
  });

  it("returns false when featured_for_goal does not match", () => {
    expect(isForYou({ ...featured, featured_for_goal: "interview_prep" }, profile)).toBe(false);
  });

  it("returns false when featured_for_city does not match", () => {
    expect(isForYou({ ...featured, featured_for_city: "Mumbai" }, profile)).toBe(false);
  });

  it("returns false when only some featured_for fields are set (partial activation)", () => {
    expect(isForYou({ ...featured, featured_for_city: null }, profile)).toBe(false);
  });

  it("returns false when featured_for_city is set but profile.city is null", () => {
    expect(isForYou({ ...featured, featured_for_city: "Bangalore" }, { ...profile, city: null })).toBe(false);
  });
});

describe("isForYou — null profile fields", () => {
  it("returns false when profile.goal is null", () => {
    expect(isForYou({ ...noFeatured, tag: "ai-pm" }, { ...profile, goal: null })).toBe(false);
  });

  it("returns false when profile.level is null", () => {
    expect(isForYou({ ...noFeatured, tag: "ai-pm" }, { ...profile, level: null })).toBe(false);
  });
});

describe("isForYou — break_into_pm goal (multi-tag)", () => {
  const breakInProfile: MinProfile = { goal: "break_into_pm", level: "aspiring", city: "Pune" };

  it("matches beginner tag", () => {
    expect(isForYou({ ...noFeatured, tag: "beginner" }, breakInProfile)).toBe(true);
  });

  it("matches resume tag", () => {
    expect(isForYou({ ...noFeatured, tag: "resume" }, breakInProfile)).toBe(true);
  });

  it("matches interview-prep tag", () => {
    expect(isForYou({ ...noFeatured, tag: "interview-prep" }, breakInProfile)).toBe(true);
  });
});
