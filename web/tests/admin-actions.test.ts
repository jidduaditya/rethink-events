import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { approveEvent, takedownEvent, setTrust } from "@/app/(admin)/admin/actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

const mockEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockAnonFrom = vi.fn(() => ({ update: mockUpdate }));
const mockAnonClient = { from: mockAnonFrom };

const mockServiceEq = vi.fn();
const mockServiceUpdate = vi.fn(() => ({ eq: mockServiceEq }));
const mockServiceFrom = vi.fn(() => ({ update: mockServiceUpdate }));
const mockServiceClient = { from: mockServiceFrom };

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockResolvedValue({ error: null });
  mockServiceEq.mockResolvedValue({ error: null });
  vi.mocked(requireAdmin).mockResolvedValue({
    userId: "admin-1",
    profile: { id: "admin-1", is_admin: true, is_trusted: true, full_name: "Admin", goal: null, level: null, city: null },
    supabase: mockAnonClient as never,
  });
  vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as never);
});

describe("approveEvent", () => {
  it("sets event state to published and revalidates /admin", async () => {
    await approveEvent("event-1", new FormData());
    expect(mockAnonFrom).toHaveBeenCalledWith("events");
    expect(mockUpdate).toHaveBeenCalledWith({ state: "published" });
    expect(mockEq).toHaveBeenCalledWith("id", "event-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("takedownEvent", () => {
  it("sets event state to taken_down and revalidates /admin", async () => {
    await takedownEvent("event-1", new FormData());
    expect(mockAnonFrom).toHaveBeenCalledWith("events");
    expect(mockUpdate).toHaveBeenCalledWith({ state: "taken_down" });
    expect(mockEq).toHaveBeenCalledWith("id", "event-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("setTrust", () => {
  it("sets is_trusted to true using the service client", async () => {
    await setTrust("profile-1", true, new FormData());
    expect(mockServiceFrom).toHaveBeenCalledWith("profiles");
    expect(mockServiceUpdate).toHaveBeenCalledWith({ is_trusted: true });
    expect(mockServiceEq).toHaveBeenCalledWith("id", "profile-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("sets is_trusted to false using the service client", async () => {
    await setTrust("profile-1", false, new FormData());
    expect(mockServiceUpdate).toHaveBeenCalledWith({ is_trusted: false });
    expect(mockServiceEq).toHaveBeenCalledWith("id", "profile-1");
    expect(requireAdmin).toHaveBeenCalled();
  });

  it("never calls the anon client for trust changes", async () => {
    await setTrust("profile-1", true, new FormData());
    expect(mockAnonFrom).not.toHaveBeenCalled();
    expect(requireAdmin).toHaveBeenCalled();
  });
});
