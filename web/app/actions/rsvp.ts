"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function rsvpToEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: rsvp, error } = await supabase.rpc("rsvp_to_event", { p_event_id: eventId });
  if (error) throw new Error(error.message);

  redirect(`/ticket/${rsvp.id}`);
}

export async function cancelRsvp(rsvpId: string, eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { error } = await supabase
    .from("rsvps")
    .update({ status: "cancelled" })
    .eq("id", rsvpId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/e/${eventId}`);
}
