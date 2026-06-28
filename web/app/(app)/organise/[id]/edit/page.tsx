import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateEvent } from "../../actions";
import { EventForm } from "../../_components/event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, description, city, venue, starts_at, ends_at, capacity, tags, state"
    )
    .eq("id", id)
    .eq("host_id", user.id)
    .single();

  // Redirect if not found, already cancelled, or taken down
  if (!event || event.state === "cancelled" || event.state === "taken_down") {
    redirect("/organise");
  }

  return (
    <div className="mx-auto max-w-2xl px-grid-margin py-stack-lg">
      <h1 className="mb-stack-lg font-serif text-headline-md font-black uppercase">
        EDIT EVENT
      </h1>
      <EventForm
        action={
          updateEvent.bind(null, id) as (
            state: import("../../actions").ActionState,
            formData: FormData
          ) => Promise<import("../../actions").ActionState>
        }
        defaultValues={event}
        submitLabel="SAVE CHANGES"
      />
    </div>
  );
}
