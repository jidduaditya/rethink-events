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
