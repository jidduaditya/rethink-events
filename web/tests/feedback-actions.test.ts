import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leaveFeedback } from "@/app/(app)/events/[id]/feedback/actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const mockInsert = vi.fn().mockResolvedValue({ error: null });

const mockAnonFrom = vi.fn((table: string) => {
  if (table === "feedback") return { insert: mockInsert };
  return {};
});

const mockAnonClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
  },
  from: mockAnonFrom,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(mockAnonClient as never);
  mockAnonClient.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockInsert.mockResolvedValue({ error: null });
});

describe("leaveFeedback", () => {
  it("inserts feedback with thumbs_up=true and a note, revalidates the path", async () => {
    const fd = new FormData();
    fd.append("thumbs_up", "true");
    fd.append("note", "Great event!");
    await leaveFeedback("event-1", fd);
    expect(mockInsert).toHaveBeenCalledWith({
      event_id: "event-1",
      user_id: "user-1",
      thumbs_up: true,
      note: "Great event!",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/events/event-1/feedback");
  });

  it("inserts feedback with thumbs_up=false and null note when note is empty", async () => {
    const fd = new FormData();
    fd.append("thumbs_up", "false");
    await leaveFeedback("event-1", fd);
    expect(mockInsert).toHaveBeenCalledWith({
      event_id: "event-1",
      user_id: "user-1",
      thumbs_up: false,
      note: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/events/event-1/feedback");
  });

  it("redirects to /login when user is unauthenticated", async () => {
    mockAnonClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const fd = new FormData();
    fd.append("thumbs_up", "true");
    await leaveFeedback("event-1", fd);
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns early without throwing on insert error (RLS rejection or duplicate)", async () => {
    mockInsert.mockResolvedValue({ error: { message: "violates row-level security policy" } });
    const fd = new FormData();
    fd.append("thumbs_up", "true");
    await expect(leaveFeedback("event-1", fd)).resolves.toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
