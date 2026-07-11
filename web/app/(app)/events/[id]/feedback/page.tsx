import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { leaveFeedback } from "./actions";

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: existing } = await supabase
    .from("feedback")
    .select("thumbs_up, note")
    .eq("event_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const action = leaveFeedback.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-4 py-10 space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Feedback
        </p>
        <h1 className="text-2xl font-mono font-bold tracking-tight">{event.title as string}</h1>
      </div>

      {existing ? (
        <div className="space-y-3 border-2 border-on-background p-6">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {BRAND.feedback.alreadySubmitted}
          </p>
          <p className="text-xl font-mono font-bold">
            {existing.thumbs_up ? BRAND.feedback.thumbsUp : BRAND.feedback.thumbsDown}
          </p>
          {existing.note && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{existing.note}</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <h2 className="text-lg font-mono font-semibold">{BRAND.feedback.heading}</h2>
            <p className="text-sm text-muted-foreground">{BRAND.feedback.subheading}</p>
          </div>

          <form action={action} className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="thumbs_up"
                  value="true"
                  className="sr-only peer"
                  required
                />
                <div className="border-2 border-on-background p-6 text-center font-mono font-semibold peer-checked:bg-on-background peer-checked:text-background transition-colors">
                  {BRAND.feedback.thumbsUp}
                </div>
              </label>
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="thumbs_up"
                  value="false"
                  className="sr-only peer"
                />
                <div className="border-2 border-on-background p-6 text-center font-mono font-semibold peer-checked:bg-on-background peer-checked:text-background transition-colors">
                  {BRAND.feedback.thumbsDown}
                </div>
              </label>
            </div>

            <textarea
              name="note"
              rows={3}
              placeholder={BRAND.feedback.notePlaceholder}
              className="w-full border-2 border-on-background bg-transparent p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-on-background"
            />

            <Button type="submit" className="w-full">
              {BRAND.feedback.submitLabel}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
