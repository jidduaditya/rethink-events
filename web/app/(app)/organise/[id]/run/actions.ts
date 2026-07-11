"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendBroadcastEmails } from "@/lib/email";

export async function toggleCheckIn(
  userId: string,
  checkedIn: boolean,
  eventId: string,
  _fd: FormData
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("host_id")
    .eq("id", eventId)
    .single();

  if (!event || event.host_id !== user.id) return;

  await supabase
    .from("rsvps")
    .update({ checked_in: checkedIn })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "going");

  revalidatePath(`/organise/${eventId}/run`);
}

export async function sendBroadcast(eventId: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const message = (formData.get("message") as string | null)?.trim() ?? "";
  if (!message) return;

  const { data: event } = await supabase
    .from("events")
    .select("id, title, host_id, broadcast_sent_at")
    .eq("id", eventId)
    .single();

  if (!event || event.host_id !== user.id) return;
  if (event.broadcast_sent_at) return;

  const service = createServiceClient();

  const { data: rsvps } = await service
    .from("rsvps")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "going");

  const userIds = (rsvps ?? []).map((r) => r.user_id as string);

  const { data: profiles } = await service
    .from("profiles")
    .select("email")
    .in("id", userIds);

  const emails = (profiles ?? [])
    .map((p) => p.email as string | null)
    .filter(Boolean) as string[];

  await sendBroadcastEmails(emails, event.title as string, message);

  await supabase
    .from("events")
    .update({
      broadcast_message: message,
      broadcast_sent_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  revalidatePath(`/organise/${eventId}/run`);
}
