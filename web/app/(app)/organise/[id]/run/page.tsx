import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { toggleCheckIn, sendBroadcast } from "./actions";

type Attendee = {
  user_id: string;
  full_name: string | null;
  checked_in: boolean;
};

type FeedbackRow = {
  thumbs_up: boolean;
  note: string | null;
  profiles: { full_name: string | null } | null;
};

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("id, title, host_id, broadcast_message, broadcast_sent_at")
    .eq("id", id)
    .single();

  if (!event) notFound();
  if (event.host_id !== user.id) notFound();

  const { data: attendeesRaw } = await supabase.rpc("event_attendees", { p_event_id: id });
  const attendees = (attendeesRaw ?? []) as Attendee[];

  const { data: feedbackRaw } = await supabase
    .from("feedback")
    .select("thumbs_up, note, profiles(full_name)")
    .eq("event_id", id);
  const feedback = (feedbackRaw ?? []) as unknown as FeedbackRow[];
  const positiveCount = feedback.filter((f) => f.thumbs_up).length;

  const broadcastAction = sendBroadcast.bind(null, event.id);
  const alreadySent = !!event.broadcast_sent_at;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-12">
      <div className="space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Run View
        </p>
        <h1 className="text-2xl font-mono font-bold tracking-tight">{event.title as string}</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-mono font-semibold border-b-2 border-on-background pb-2">
          ATTENDEES ({attendees.length})
        </h2>
        {!attendees.length ? (
          <p className="text-sm font-mono text-muted-foreground">{BRAND.run.noAttendees}</p>
        ) : (
          <ul className="divide-y divide-on-background">
            {attendees.map((attendee) => {
              const checkAction = toggleCheckIn.bind(
                null,
                attendee.user_id,
                !attendee.checked_in,
                event.id
              );
              return (
                <li key={attendee.user_id} className="flex items-center justify-between gap-4 py-3">
                  <span className="font-medium">
                    {attendee.full_name ?? "(no name)"}
                    {attendee.checked_in && (
                      <span className="ml-2 text-xs font-mono text-muted-foreground">✓</span>
                    )}
                  </span>
                  <form action={checkAction}>
                    <Button type="submit" size="sm" variant={attendee.checked_in ? "outline" : "default"}>
                      {attendee.checked_in ? BRAND.run.uncheckIn : BRAND.run.checkIn}
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-mono font-semibold border-b-2 border-on-background pb-2">
          BROADCAST
        </h2>
        {alreadySent ? (
          <div className="space-y-1">
            <p className="text-xs font-mono text-muted-foreground">
              {BRAND.run.alreadySent} —{" "}
              {new Date(event.broadcast_sent_at as string).toLocaleString()}
            </p>
            <p className="text-sm whitespace-pre-wrap">{event.broadcast_message as string}</p>
          </div>
        ) : (
          <form action={broadcastAction} className="space-y-3">
            <textarea
              name="message"
              required
              rows={4}
              placeholder={BRAND.run.broadcastPlaceholder}
              className="w-full border-2 border-on-background bg-transparent p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-on-background"
            />
            <Button type="submit">{BRAND.run.broadcast}</Button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-mono font-semibold border-b-2 border-on-background pb-2">
          {BRAND.feedback.hostHeading} ({feedback.length})
        </h2>
        {!feedback.length ? (
          <p className="text-sm font-mono text-muted-foreground">{BRAND.feedback.noFeedback}</p>
        ) : (
          <>
            <p className="text-sm font-mono text-muted-foreground">
              {positiveCount} / {feedback.length} positive
            </p>
            {feedback.filter((f) => f.note).length > 0 && (
              <ul className="divide-y divide-on-background">
                {feedback
                  .filter((f) => f.note)
                  .map((f, i) => (
                    <li key={i} className="py-3 space-y-0.5">
                      <p className="text-xs font-mono text-muted-foreground">
                        {f.profiles?.full_name ?? "(anonymous)"} —{" "}
                        {f.thumbs_up ? BRAND.feedback.thumbsUp : BRAND.feedback.thumbsDown}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{f.note}</p>
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  );
}
