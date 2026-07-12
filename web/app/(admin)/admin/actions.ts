"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

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

const emailSchema = z.email();

export async function addToWhitelist(formData: FormData): Promise<void> {
  const { userId, supabase } = await requireAdmin();
  const raw = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) return;

  const { error } = await supabase
    .from("host_whitelist")
    .insert({ email: parsed.data, added_by: userId });
  // 23505 = duplicate email: already whitelisted, treat as success
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath("/admin");
}

export async function removeFromWhitelist(email: string, _formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("host_whitelist").delete().eq("email", email);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
