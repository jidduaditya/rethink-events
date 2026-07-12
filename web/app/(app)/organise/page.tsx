import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { cancelEvent } from "./actions";
import { StateBadge } from "./_components/state-badge";

export default async function OrganisePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_trusted")
    .eq("id", user.id)
    .single();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, city, starts_at, state")
    .eq("host_id", user.id)
    .order("starts_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-grid-margin py-stack-lg">
      <div className="mb-stack-lg flex items-center justify-between">
        <h1 className="font-serif text-headline-md font-black uppercase">
          MY EVENTS
        </h1>
        {profile?.is_trusted && (
          <Link href="/organise/new" className={buttonVariants({ size: "sm" })}>
            + NEW EVENT
          </Link>
        )}
      </div>

      {!events?.length ? (
        <p className="font-mono text-label-mono text-on-surface-variant">
          {BRAND.empty.hostEvents}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => {
            const boundCancel = cancelEvent.bind(null, event.id);
            const editable =
              event.state !== "cancelled" && event.state !== "taken_down";
            return (
              <li
                key={event.id}
                className="border-standard flex items-start justify-between gap-4 bg-surface-container-low p-4"
              >
                <div className="flex flex-col gap-1.5">
                  <p className="font-sans text-body-md font-semibold">
                    {event.title}
                  </p>
                  <p className="font-mono text-label-data uppercase text-on-surface-variant">
                    {event.city.toUpperCase()} &bull;{" "}
                    {new Date(event.starts_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <StateBadge state={event.state} />
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {editable && (
                    <Link
                      href={`/organise/${event.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      EDIT
                    </Link>
                  )}
                  {event.state === "published" && (
                    <form action={boundCancel}>
                      <Button type="submit" variant="destructive" size="sm">
                        CANCEL
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
