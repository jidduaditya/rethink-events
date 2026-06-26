import type { Event, EventTag, Profile, ProfileGoal, ProfileLevel } from "@/lib/types";

const GOAL_TAGS: Record<ProfileGoal, EventTag[]> = {
  break_into_pm:  ["beginner", "resume", "interview-prep"],
  grow_as_pm:     ["build", "ai-pm"],
  build_products: ["build"],
  ai_pm:          ["ai-pm"],
  interview_prep: ["interview-prep"],
};

const LEVEL_TAGS: Record<ProfileLevel, EventTag[]> = {
  aspiring: ["beginner"],
  early:    ["beginner", "interview-prep"],
  mid:      ["build", "ai-pm"],
  senior:   ["build", "ai-pm"],
};

export function isForYou(
  event: Pick<Event, "tag" | "featured_for_goal" | "featured_for_level" | "featured_for_city">,
  profile: Pick<Profile, "goal" | "level" | "city">
): boolean {
  if (!profile.goal || !profile.level) return false;

  // Tag match: union of goal tags and level tags
  if (event.tag) {
    const matching = new Set<string>([
      ...(GOAL_TAGS[profile.goal] ?? []),
      ...(LEVEL_TAGS[profile.level] ?? []),
    ]);
    if (matching.has(event.tag)) return true;
  }

  // Admin featured match: all three must be non-null and match exactly
  if (
    event.featured_for_goal &&
    event.featured_for_level &&
    event.featured_for_city
  ) {
    return (
      event.featured_for_goal  === profile.goal &&
      event.featured_for_level === profile.level &&
      event.featured_for_city  === profile.city
    );
  }

  return false;
}
