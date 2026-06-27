# Evals and Guardrails — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build app-layer safety infrastructure (route protection, auth guards, input validation) and a matching unit test suite that runs without Supabase credentials — before any feature implementation begins.

**Architecture:** Three layers: (1) Zod schema for pure-function validation — no runtime deps, fully testable; (2) auth guard helpers consumed by Server Actions — mock-tested in isolation; (3) route protection added to `proxy.ts` with the gating logic extracted into a pure function so it stays unit-testable. All new tests run in the existing Vitest node environment without real DB credentials.

**Tech Stack:** Zod (new), Vitest (existing), Next.js 16 App Router, @supabase/ssr (existing)

## Global Constraints

- Work inside `web/`. Do not modify anything outside `web/`.
- `web/lib/supabase/types.ts` does not exist yet (needs DB keys to generate). Use inline minimal types until generated; mark with `// ponytail:` comment.
- All new tests must run without Supabase credentials — mock `@/lib/supabase/server` with `vi.mock`.
- Next.js 16 uses `proxy.ts` (not `middleware.ts`) for the middleware entrypoint. Route protection extends `web/proxy.ts`.
- Server Supabase client function is `createClient` from `@/lib/supabase/server` (not `createServerClient`).
- Cities fixed enum: `bangalore | pune | delhi | hyderabad`. Tags fixed enum: `beginner | interview_prep | ai_pm | build | resume`.
- Ponytail full mode active: laziest solution, `// ponytail:` comments on deliberate shortcuts.
- Do not break the 37 existing RLS tests. They need DB keys to run; don't touch `tests/rls.test.ts`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `web/vitest.config.ts` | Modify | Add `@/` path alias |
| `web/package.json` | Modify | Add Zod dependency |
| `web/lib/validations/event.ts` | Create | Zod schema + exported type for the event form |
| `web/lib/auth.ts` | Create | `requireAuth`, `requireAdmin`, `requireOwner` — throw `AuthError` on failure |
| `web/lib/proxy-auth.ts` | Create | Pure `getRouteAuth(pathname)` function — route classification with no side effects |
| `web/proxy.ts` | Modify | Add route protection after session refresh, using `getRouteAuth` |
| `web/tests/event-validation.test.ts` | Create | 11 pure unit tests for the Zod schema |
| `web/tests/auth-guard.test.ts` | Create | 8 unit tests for auth guards with mocked Supabase |
| `web/tests/proxy-auth.test.ts` | Create | 9 pure unit tests for route classification |

---

## Task 0: Repo setup + Zod install

**Files:**
- Clone into working directory
- Modify: `web/package.json` (add Zod)
- Modify: `web/vitest.config.ts` (add `@/` path alias)

- [ ] **Step 1: Clone the repo into the current working directory**

```bash
git clone https://github.com/OrangeAKA/reThinkEvents.git "/Users/aasmac/Desktop/AI Projects/Rethink Events Final"
```

Expected: repo cloned, you can see `web/`, `docs/`, `ReThink-Events-V1.md` at the root.

- [ ] **Step 2: Install existing dependencies**

```bash
cd "/Users/aasmac/Desktop/AI Projects/Rethink Events Final/web" && npm install
```

Expected: clean install, no errors.

- [ ] **Step 3: Add Zod**

```bash
npm install zod
```

Expected: `zod` appears in `web/package.json` dependencies.

- [ ] **Step 4: Copy this plan into the repo**

```bash
cp "/private/tmp/claude-501/-Users-aasmac-Desktop-AI-Projects-Rethink-Events-Final/1da8ee36-a0b0-4aa7-a7cb-6204a0453850/scratchpad/2026-06-27-evals-and-guardrails.md" \
   "/Users/aasmac/Desktop/AI Projects/Rethink Events Final/docs/superpowers/plans/2026-06-27-evals-and-guardrails.md"
```

- [ ] **Step 5: Verify build still works**

```bash
npm run build
```

Expected: build succeeds (TypeScript passes, no import errors).

- [ ] **Step 6: Add `@/` alias to vitest config**

Replace `web/vitest.config.ts` with:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
```

- [ ] **Step 7: Create the branch and commit**

```bash
git checkout -b slice/guardrails-and-evals
git add web/package.json web/package-lock.json web/vitest.config.ts \
        docs/superpowers/plans/2026-06-27-evals-and-guardrails.md
git commit -m "chore: add Zod + vitest path alias for guardrails branch"
```

---

## Task 1: Zod event schema + pure unit tests

**Files:**
- Create: `web/lib/validations/event.ts`
- Create: `web/tests/event-validation.test.ts`

**Produces:** `eventSchema` (Zod object), `EventInput` (inferred TypeScript type)

- [ ] **Step 1: Write the failing tests**

Create `web/tests/event-validation.test.ts`:

```ts
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
    expect(r.error?.flatten().formErrors[0]).toMatch(/end/i);
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
```

- [ ] **Step 2: Run — expect all to fail**

```bash
npx vitest run tests/event-validation.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/validations/event'`

- [ ] **Step 3: Implement the schema**

Create `web/lib/validations/event.ts`:

```ts
import { z } from "zod";

const CITIES = ["bangalore", "pune", "delhi", "hyderabad"] as const;
const TAGS = ["beginner", "interview_prep", "ai_pm", "build", "resume"] as const;

export const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().optional(),
    city: z.enum(CITIES),
    venue: z.string().optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    capacity: z.number().int().positive().nullable().optional(),
    tags: z.array(z.enum(TAGS)).default([]),
  })
  .refine((d) => new Date(d.ends_at) > new Date(d.starts_at), {
    message: "End time must be after start time",
    path: ["ends_at"],
  });

export type EventInput = z.infer<typeof eventSchema>;
```

- [ ] **Step 4: Run — expect all to pass**

```bash
npx vitest run tests/event-validation.test.ts
```

Expected: 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/validations/event.ts web/tests/event-validation.test.ts
git commit -m "feat(guardrails): Zod event schema + unit tests"
```

---

## Task 2: Auth guard helpers + unit tests

**Files:**
- Create: `web/lib/auth.ts`
- Create: `web/tests/auth-guard.test.ts`

**Produces:** `AuthError` class, `requireAuth()`, `requireAdmin()`, `requireOwner(eventId: string)`

**Consumes:** `createClient` from `@/lib/supabase/server`

- [ ] **Step 1: Write the failing tests**

Create `web/tests/auth-guard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { AuthError, requireAuth, requireAdmin, requireOwner } from "@/lib/auth";

const BASE_PROFILE = {
  id: "user-1",
  is_admin: false,
  is_trusted: false,
  full_name: "Test User",
  goal: null,
  level: null,
  city: null,
};

function makeMockClient({
  user = { id: "user-1" } as { id: string } | null,
  profile = BASE_PROFILE as typeof BASE_PROFILE | null,
  eventHostId = "user-1" as string | null,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data:
          table === "profiles"
            ? profile
            : eventHostId != null
            ? { host_id: eventHostId }
            : null,
        error: null,
      }),
    })),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("requireAuth", () => {
  it("returns userId and profile for an authenticated user", async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockClient() as any);
    const result = await requireAuth();
    expect(result.userId).toBe("user-1");
    expect(result.profile.is_admin).toBe(false);
  });

  it("throws UNAUTHORIZED when there is no session", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockClient({ user: null }) as any
    );
    await expect(requireAuth()).rejects.toThrow(AuthError);
    await expect(requireAuth()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws UNAUTHORIZED when the profile row is missing", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockClient({ profile: null }) as any
    );
    await expect(requireAuth()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("requireAdmin", () => {
  it("resolves when the user is an admin", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockClient({ profile: { ...BASE_PROFILE, is_admin: true } }) as any
    );
    const result = await requireAdmin();
    expect(result.profile.is_admin).toBe(true);
  });

  it("throws FORBIDDEN when the user is not an admin", async () => {
    vi.mocked(createClient).mockResolvedValue(makeMockClient() as any);
    await expect(requireAdmin()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("requireOwner", () => {
  it("resolves when the user owns the event", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockClient({ eventHostId: "user-1" }) as any
    );
    await expect(requireOwner("event-abc")).resolves.toBeDefined();
  });

  it("throws FORBIDDEN when the user does not own the event", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockClient({ eventHostId: "other-user" }) as any
    );
    await expect(requireOwner("event-abc")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when the event does not exist", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeMockClient({ eventHostId: null }) as any
    );
    await expect(requireOwner("event-abc")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
```

- [ ] **Step 2: Run — expect all to fail**

```bash
npx vitest run tests/auth-guard.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Implement the auth guards**

Create `web/lib/auth.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

// ponytail: inline until `supabase gen types` runs (needs DB keys)
type MinProfile = {
  id: string;
  is_admin: boolean;
  is_trusted: boolean;
  full_name: string | null;
  goal: string | null;
  level: string | null;
  city: string | null;
};

export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

export async function requireAuth(): Promise<{
  userId: string;
  profile: MinProfile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AuthError("UNAUTHORIZED");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_admin, is_trusted, full_name, goal, level, city")
    .eq("id", user.id)
    .single();

  if (!profile) throw new AuthError("UNAUTHORIZED");

  return { userId: user.id, profile };
}

export async function requireAdmin() {
  const result = await requireAuth();
  if (!result.profile.is_admin) throw new AuthError("FORBIDDEN");
  return result;
}

export async function requireOwner(eventId: string) {
  const { userId, profile } = await requireAuth();
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();
  if (!event || event.host_id !== userId) throw new AuthError("FORBIDDEN");
  return { userId, profile };
}
```

- [ ] **Step 4: Run — expect all to pass**

```bash
npx vitest run tests/auth-guard.test.ts
```

Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/lib/auth.ts web/tests/auth-guard.test.ts
git commit -m "feat(guardrails): auth guard helpers + unit tests"
```

---

## Task 3: Route protection + pure unit tests

**Files:**
- Create: `web/lib/proxy-auth.ts`
- Modify: `web/proxy.ts`
- Create: `web/tests/proxy-auth.test.ts`

**Produces:** `getRouteAuth(pathname: string): 'public' | 'auth' | 'admin'`

- [ ] **Step 1: Write the failing tests**

Create `web/tests/proxy-auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getRouteAuth } from "@/lib/proxy-auth";

describe("getRouteAuth", () => {
  it("marks /admin as admin-only", () => {
    expect(getRouteAuth("/admin")).toBe("admin");
  });

  it("marks /admin/* as admin-only", () => {
    expect(getRouteAuth("/admin/events")).toBe("admin");
    expect(getRouteAuth("/admin/users/123")).toBe("admin");
  });

  it("marks /organise as auth-required", () => {
    expect(getRouteAuth("/organise")).toBe("auth");
  });

  it("marks /organise/* as auth-required", () => {
    expect(getRouteAuth("/organise/new")).toBe("auth");
    expect(getRouteAuth("/organise/abc/edit")).toBe("auth");
    expect(getRouteAuth("/organise/abc/run")).toBe("auth");
  });

  it("marks /ticket/* as auth-required", () => {
    expect(getRouteAuth("/ticket/abc-123")).toBe("auth");
  });

  it("marks / as public", () => {
    expect(getRouteAuth("/")).toBe("public");
  });

  it("marks /e/* as public (anon event pages)", () => {
    expect(getRouteAuth("/e/some-event-id")).toBe("public");
  });

  it("marks /login as public", () => {
    expect(getRouteAuth("/login")).toBe("public");
  });

  it("marks /onboarding as public", () => {
    expect(getRouteAuth("/onboarding")).toBe("public");
  });
});
```

- [ ] **Step 2: Run — expect all to fail**

```bash
npx vitest run tests/proxy-auth.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/proxy-auth'`

- [ ] **Step 3: Implement the pure function**

Create `web/lib/proxy-auth.ts`:

```ts
export function getRouteAuth(
  pathname: string
): "public" | "auth" | "admin" {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/organise") || pathname.startsWith("/ticket"))
    return "auth";
  return "public";
}
```

- [ ] **Step 4: Run — expect all to pass**

```bash
npx vitest run tests/proxy-auth.test.ts
```

Expected: 9 tests PASS

- [ ] **Step 5: Wire route protection into proxy.ts**

Replace `web/proxy.ts` with:

```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getRouteAuth } from "@/lib/proxy-auth";

export async function proxy(request: NextRequest) {
  // Always refresh the session first so Server Components see a valid user.
  const response = await updateSession(request);

  const routeAuth = getRouteAuth(request.nextUrl.pathname);
  if (routeAuth === "public") return response;

  // Read the user from the refreshed cookies (read-only — no cookie writes here).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (routeAuth === "admin") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 6: Run all three test files to confirm nothing broke**

```bash
npx vitest run tests/event-validation.test.ts tests/auth-guard.test.ts tests/proxy-auth.test.ts
```

Expected: 28 tests PASS

- [ ] **Step 7: Commit**

```bash
git add web/lib/proxy-auth.ts web/proxy.ts web/tests/proxy-auth.test.ts
git commit -m "feat(guardrails): route protection in proxy.ts + pure unit tests"
```

---

## Done

28 tests, 0 Supabase credentials required, 3 commits. Slice 3.1 can now import `requireAuth` / `requireOwner` from `@/lib/auth` and `eventSchema` from `@/lib/validations/event` — the net is in place before the implementation exists.
