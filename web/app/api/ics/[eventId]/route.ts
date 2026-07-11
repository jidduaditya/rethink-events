import { createClient } from "@/lib/supabase/server";
import { buildIcsContent } from "@/lib/calendar";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, city, venue, starts_at, ends_at, description")
    .eq("id", eventId)
    .eq("state", "published")
    .single();

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  const ics = buildIcsContent(event);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event.ics"`,
    },
  });
}
