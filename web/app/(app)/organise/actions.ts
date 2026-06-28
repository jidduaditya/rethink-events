"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { eventSchema } from "@/lib/validations/event";

export type ActionState = {
  error: {
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
  };
} | null;

function parseFormData(formData: FormData) {
  const capacityRaw = formData.get("capacity") as string | null;
  // datetime-local yields "YYYY-MM-DDTHH:MM" (16 chars, no timezone).
  // Append IST offset so times store correctly in Supabase (all cities are UTC+5:30).
  const toISO = (v: string | null) =>
    v ? (v.length === 16 ? `${v}:00+05:30` : v) : "";
  return {
    title: (formData.get("title") as string) ?? "",
    description: (formData.get("description") as string) || undefined,
    city: (formData.get("city") as string) ?? "",
    venue: (formData.get("venue") as string) || undefined,
    starts_at: toISO(formData.get("starts_at") as string | null),
    ends_at: toISO(formData.get("ends_at") as string | null),
    capacity: capacityRaw ? Number(capacityRaw) : null,
    tags: formData.getAll("tags") as string[],
  };
}

export async function createEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, supabase } = await requireAuth();
  const parsed = parseFormData(formData);
  const result = eventSchema.safeParse(parsed);
  if (!result.success) return { error: result.error.flatten() };

  const { data, error } = await supabase
    .from("events")
    .insert({ ...result.data, host_id: userId })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: {
        formErrors: [error?.message ?? "Failed to create event"],
        fieldErrors: {},
      },
    };
  }
  revalidatePath("/organise");
  redirect("/organise");
  return null;
}

export async function updateEvent(
  eventId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, supabase } = await requireAuth();
  const parsed = parseFormData(formData);
  const result = eventSchema.safeParse(parsed);
  if (!result.success) return { error: result.error.flatten() };

  const { data: updated, error } = await supabase
    .from("events")
    .update(result.data)
    .eq("id", eventId)
    .eq("host_id", userId)
    .select("id")
    .single();

  if (error || !updated) {
    return {
      error: {
        formErrors: [error?.message ?? "Event not found or already closed"],
        fieldErrors: {},
      },
    };
  }
  revalidatePath("/organise");
  redirect("/organise");
  return null;
}

export async function cancelEvent(
  eventId: string,
  _formData: FormData
): Promise<void> {
  const { userId, supabase } = await requireAuth();

  const { error } = await supabase
    .from("events")
    .update({ state: "cancelled" })
    .eq("id", eventId)
    .eq("host_id", userId);

  if (error) throw new Error(error.message);

  // TODO: email all going RSVPs when lib/email/ is available (Resend)
  revalidatePath("/organise");
}
