import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { approveEvent, takedownEvent, addToWhitelist, removeFromWhitelist } from "@/app/(admin)/admin/actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));

const mockEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockWlInsert = vi.fn();
const mockWlDeleteEq = vi.fn();
const mockWlDelete = vi.fn(() => ({ eq: mockWlDeleteEq }));
const mockAnonFrom = vi.fn(() => ({ update: mockUpdate, insert: mockWlInsert, delete: mockWlDelete }));
const mockAnonClient = { from: mockAnonFrom };

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockResolvedValue({ error: null });
  mockWlInsert.mockResolvedValue({ error: null });
  mockWlDeleteEq.mockResolvedValue({ error: null });
  vi.mocked(requireAdmin).mockResolvedValue({
    userId: "admin-1",
    profile: { id: "admin-1", is_admin: true, is_trusted: true, full_name: "Admin", goal: null, level: null, city: null },
    supabase: mockAnonClient as never,
  });
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

describe("addToWhitelist", () => {
  function fd(email: string) {
    const f = new FormData();
    f.set("email", email);
    return f;
  }

  it("lowercases and inserts the email via the admin's own client", async () => {
    await addToWhitelist(fd("  Aditya@Example.COM "));
    expect(mockAnonFrom).toHaveBeenCalledWith("host_whitelist");
    expect(mockWlInsert).toHaveBeenCalledWith({ email: "aditya@example.com", added_by: "admin-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("rejects an invalid email without inserting", async () => {
    await addToWhitelist(fd("not-an-email"));
    expect(mockWlInsert).not.toHaveBeenCalled();
  });

  it("requires admin", async () => {
    await addToWhitelist(fd("x@y.dev"));
    expect(requireAdmin).toHaveBeenCalled();
  });
});

describe("removeFromWhitelist", () => {
  it("deletes the email row", async () => {
    await removeFromWhitelist("gone@example.com", new FormData());
    expect(mockAnonFrom).toHaveBeenCalledWith("host_whitelist");
    expect(mockWlDeleteEq).toHaveBeenCalledWith("email", "gone@example.com");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(requireAdmin).toHaveBeenCalled();
  });
});
