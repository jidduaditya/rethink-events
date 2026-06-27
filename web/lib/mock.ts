// ponytail: mock data only — used by Phase 1 UI skeleton. Replaced by real DB reads in Phase 3.

export type City = "bangalore" | "pune" | "delhi" | "hyderabad";
export type EventTag = "beginner" | "interview_prep" | "ai_pm" | "build" | "resume";
export type EventState = "draft" | "pending_review" | "published" | "cancelled" | "taken_down";
export type MemberGoal = "break_into_pm" | "interview_prep" | "level_up" | "build_with_ai" | "switch_domain";
export type MemberLevel = "aspiring" | "junior" | "mid" | "senior";

export interface Event {
  id: string;
  host_id: string;
  host_name: string | null;
  title: string;
  description: string | null;
  city: City;
  venue: string | null;
  starts_at: string; // ISO 8601
  ends_at: string;
  capacity: number | null;
  tags: EventTag[];
  state: EventState;
  featured_for: { goal?: MemberGoal; level?: MemberLevel; city?: City } | null;
  created_at: string;
  updated_at: string;
  // join: going count (available when fetched with rsvps aggregation)
  going_count?: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  goal: MemberGoal | null;
  level: MemberLevel | null;
  city: City | null;
  is_trusted: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Rsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: "going" | "cancelled";
  checked_in: boolean;
  created_at: string;
}

// ─── Sample events (6 total, across all 4 cities, varied states/tags) ────────

const NOW = new Date("2026-06-27T10:00:00Z");
const d = (daysAhead: number, hours = 0) =>
  new Date(NOW.getTime() + daysAhead * 86400_000 + hours * 3600_000).toISOString();

export const MOCK_EVENTS: Event[] = [
  {
    id: "e1",
    host_id: "u-host-1",
    host_name: "Priya Nair",
    title: "Building Your First AI Agent",
    description:
      "A hands-on session covering tool use, prompt chains, and agent loops. Bring a laptop and a half-formed idea.",
    city: "bangalore",
    venue: "Koramangala Social, 100ft Road",
    starts_at: d(3, 18),
    ends_at: d(3, 20),
    capacity: 40,
    tags: ["ai_pm", "beginner"],
    state: "published",
    featured_for: { goal: "build_with_ai" },
    created_at: d(-5),
    updated_at: d(-5),
    going_count: 27,
  },
  {
    id: "e2",
    host_id: "u-host-2",
    host_name: "Rahul Shetty",
    title: "PM Interview Bootcamp: System Design Round",
    description:
      "We mock the hardest round. Three PMs take turns as interviewer. Intermediate-level; bring a framework.",
    city: "pune",
    venue: "WeWork Baner, Level 4",
    starts_at: d(7, 17),
    ends_at: d(7, 20),
    capacity: 30,
    tags: ["interview_prep"],
    state: "published",
    featured_for: { goal: "interview_prep", level: "mid" },
    created_at: d(-10),
    updated_at: d(-10),
    going_count: 18,
  },
  {
    id: "e3",
    host_id: "u-host-3",
    host_name: "Divya Menon",
    title: "Resume Teardown: Real Feedback, No Sugarcoating",
    description:
      "Submit your resume by Thursday. We tear it apart live — what's landing, what isn't, and why. Max 10 resumes.",
    city: "hyderabad",
    venue: "T-Hub, Raidurgam",
    starts_at: d(2, 11),
    ends_at: d(2, 13),
    capacity: 25,
    tags: ["resume", "beginner"],
    state: "published",
    featured_for: { goal: "break_into_pm" },
    created_at: d(-3),
    updated_at: d(-3),
    going_count: 22,
  },
  {
    id: "e4",
    host_id: "u-host-4",
    host_name: "Ankit Joshi",
    title: "Side Project Weekend: Getting Out of the Building",
    description:
      "You have an idea. This is where you test it with strangers. We do 20-minute customer interviews live.",
    city: "delhi",
    venue: "91springboard, Okhla Phase III",
    starts_at: d(14, 10),
    ends_at: d(14, 13),
    capacity: null,
    tags: ["build"],
    state: "published",
    featured_for: null,
    created_at: d(-1),
    updated_at: d(-1),
    going_count: 9,
  },
  {
    id: "e5",
    host_id: "u-host-1",
    host_name: "Priya Nair",
    title: "Roadmapping Without a Roadmap",
    description:
      "How to communicate strategy when your roadmap changes every sprint. Frameworks that survive the real world.",
    city: "bangalore",
    venue: "Dyu Art Cafe, Koramangala",
    starts_at: d(21, 18),
    ends_at: d(21, 20),
    capacity: 20,
    tags: ["ai_pm"],
    state: "published",
    featured_for: { goal: "level_up", level: "senior" },
    created_at: d(-2),
    updated_at: d(-2),
    going_count: 4,
  },
  {
    id: "e6",
    host_id: "u-host-5",
    host_name: "Neha Kulkarni",
    title: "Breaking into Product from Engineering",
    description:
      "Real talk from PMs who made the switch. What the job actually is, and how to make the case.",
    city: "pune",
    venue: "Regus, Baner Pashan Link Road",
    starts_at: d(10, 17),
    ends_at: d(10, 19),
    capacity: 35,
    tags: ["beginner", "interview_prep"],
    state: "published",
    featured_for: { goal: "break_into_pm" },
    created_at: d(-4),
    updated_at: d(-4),
    going_count: 14,
  },
];

// Convenience slices used by the feed
export const MOCK_UPCOMING = MOCK_EVENTS.filter((e) => e.state === "published");
export const MOCK_FEATURED = MOCK_EVENTS.filter((e) => e.featured_for !== null);

// Mock current user — mid-level PM in Bangalore, goal: level_up
export const MOCK_ME: Profile = {
  id: "u-me",
  full_name: "Krishna",
  email: "me@rethink.pm",
  goal: "level_up",
  level: "mid",
  city: "bangalore",
  is_trusted: false,
  is_admin: false,
  created_at: d(-30),
};

// Mock RSVPs for current user
export const MOCK_MY_RSVPS: Rsvp[] = [
  {
    id: "r1",
    event_id: "e1",
    user_id: "u-me",
    status: "going",
    checked_in: false,
    created_at: d(-2),
  },
];
