import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EventDetailClient } from "./event-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_event", { p_event_id: id });
  if (!data) return { title: "RETHINK EVENTS" };
  return {
    title: `${data.title} — RETHINK`,
    description: data.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: data.title,
      description: data.description?.slice(0, 160) ?? undefined,
      images: data.image_url ? [data.image_url] : [],
    },
  };
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <EventDetailClient params={params} />;
}
