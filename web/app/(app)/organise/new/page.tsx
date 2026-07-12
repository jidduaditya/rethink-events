import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { createEvent } from "../actions";
import { EventForm } from "../_components/event-form";

export default async function NewEventPage() {
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
  if (!profile?.is_trusted) redirect("/organise");

  return (
    <div className="mx-auto max-w-2xl px-grid-margin py-stack-lg">
      <h1 className="mb-stack-lg font-serif text-headline-md font-black uppercase">
        {BRAND.create.header}
      </h1>
      <EventForm action={createEvent} />
    </div>
  );
}
