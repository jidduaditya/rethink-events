"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function approveEvent(eventId: string, _formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("events").update({ state: "published" }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function takedownEvent(eventId: string, _formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("events").update({ state: "taken_down" }).eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function setTrust(profileId: string, trusted: boolean, _formData: FormData): Promise<void> {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service.from("profiles").update({ is_trusted: trusted }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
