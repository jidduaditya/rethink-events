"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function leaveFeedback(eventId: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return void redirect("/login");

  const thumbsUpRaw = formData.get("thumbs_up") as string | null;
  if (!thumbsUpRaw) return;
  const thumbsUp = thumbsUpRaw === "true";
  const note = (formData.get("note") as string | null)?.trim() || null;

  const { error } = await supabase.from("feedback").insert({
    event_id: eventId,
    user_id: user.id,
    thumbs_up: thumbsUp,
    note,
  });

  if (error) return;

  revalidatePath(`/events/${eventId}/feedback`);
}
