import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEvent, updateEvent, cancelEvent } from "@/app/(app)/organise/actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  requireTrusted: vi.fn(),
  AuthError: class AuthError extends Error {
    constructor(public code: string) {
      super(code);
      this.name = "AuthError";
    }
  },
}));

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth, requireTrusted } from "@/lib/auth";

// Chainable supabase mock
const mockSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));
// cancelEvent: .update().eq("id").eq("host_id") — terminal, returns { error: null }
const mockEqHostId = vi.fn();
// updateEvent: .update().eq("id").eq("host_id").select("id").single()
const mockUpdateSingle = vi.fn();
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }));
const mockEqId = vi.fn(() => ({ eq: mockEqHostId }));
const mockUpdate = vi.fn(() => ({ eq: mockEqId }));
const mockSupabase = {
  from: vi.fn(() => ({ insert: mockInsert, update: mockUpdate })),
};

beforeEach(() => {
  vi.clearAllMocks();
  const authResult = {
    userId: "user-1",
    profile: {
      id: "user-1",
      is_admin: false,
      is_trusted: false,
      full_name: "Test User",
      goal: null,
      level: null,
      city: null,
    },
    supabase: mockSupabase as any,
  };
  vi.mocked(requireAuth).mockResolvedValue(authResult);
  vi.mocked(requireTrusted).mockResolvedValue(authResult);
  mockSingle.mockResolvedValue({ data: { id: "event-1" }, error: null });
  mockEqHostId.mockResolvedValue({ error: null }); // cancelEvent default
  mockUpdateSingle.mockResolvedValue({ data: { id: "event-1" }, error: null }); // updateEvent default
});

function makeFormData(overrides: Record<string, string | string[]> = {}): FormData {
  const fd = new FormData();
  const defaults: Record<string, string | string[]> = {
    title: "Test Event",
    description: "Great event",
    city: "bangalore",
    venue: "Koramangala Hub",
    starts_at: "2025-12-25T19:00",
    ends_at: "2025-12-25T21:00",
    tags: [],
  };
  const merged = { ...defaults, ...overrides };
  for (const [key, val] of Object.entries(merged)) {
    if (Array.isArray(val)) {
      val.forEach((v) => fd.append(key, v));
    } else {
      fd.set(key, val);
    }
  }
  return fd;
}

describe("createEvent", () => {
  it("inserts event with correct data and redirects to /organise", async () => {
    const result = await createEvent(null, makeFormData());
    expect(mockSupabase.from).toHaveBeenCalledWith("events");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test Event",
        city: "bangalore",
        host_id: "user-1",
      })
    );
    expect(redirect).toHaveBeenCalledWith("/organise");
    expect(result).toBeNull();
  });

  it("returns fieldErrors.title when title is missing", async () => {
    const result = await createEvent(null, makeFormData({ title: "" }));
    expect(result?.error.fieldErrors.title?.[0]).toMatch(/required/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns fieldErrors.ends_at when end is before start", async () => {
    const result = await createEvent(
      null,
      makeFormData({ starts_at: "2025-12-25T21:00", ends_at: "2025-12-25T19:00" })
    );
    expect(result?.error.fieldErrors.ends_at?.[0]).toMatch(/after/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns formErrors when DB insert fails", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "DB error" } });
    const result = await createEvent(null, makeFormData());
    expect(result?.error.formErrors[0]).toBe("DB error");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("createEvent rejects untrusted users", async () => {
    vi.mocked(requireTrusted).mockRejectedValue(Object.assign(new Error("FORBIDDEN"), { code: "FORBIDDEN" }));
    await expect(createEvent(null, makeFormData())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("updateEvent", () => {
  beforeEach(() => {
    mockEqHostId.mockReturnValue({ select: mockUpdateSelect });
  });

  it("updates event with correct data and redirects to /organise", async () => {
    const result = await updateEvent("event-1", null, makeFormData());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test Event", city: "bangalore" })
    );
    expect(mockEqId).toHaveBeenCalledWith("id", "event-1");
    expect(mockEqHostId).toHaveBeenCalledWith("host_id", "user-1");
    expect(mockUpdateSelect).toHaveBeenCalledWith("id");
    expect(redirect).toHaveBeenCalledWith("/organise");
    expect(result).toBeNull();
  });

  it("returns formErrors when DB update fails", async () => {
    mockUpdateSingle.mockResolvedValueOnce({ data: null, error: { message: "Update failed" } });
    const result = await updateEvent("event-1", null, makeFormData());
    expect(result?.error.formErrors[0]).toBe("Update failed");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("cancelEvent", () => {
  it("sets state to cancelled and revalidates /organise", async () => {
    await cancelEvent("event-1", new FormData());
    expect(mockUpdate).toHaveBeenCalledWith({ state: "cancelled" });
    expect(mockEqId).toHaveBeenCalledWith("id", "event-1");
    expect(mockEqHostId).toHaveBeenCalledWith("host_id", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/organise");
  });
});
