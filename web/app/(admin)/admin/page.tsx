import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";
import { approveEvent, takedownEvent, addToWhitelist, removeFromWhitelist } from "./actions";
import { BRAND } from "@/lib/brand";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!adminProfile?.is_admin) redirect("/");

  const [{ data: pendingEvents }, { data: publishedEvents }, { data: profiles }, { data: whitelist }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, title, city, starts_at, host_name")
        .eq("state", "pending_review")
        .order("created_at", { ascending: true }),
      supabase
        .from("events")
        .select("id, title, city, starts_at, host_name")
        .eq("state", "published")
        .order("starts_at", { ascending: false })
        .limit(50),
      createServiceClient()
        .from("profiles")
        .select("id, full_name, email, is_trusted, is_admin")
        .order("created_at", { ascending: true }),
      supabase
        .from("host_whitelist")
        .select("email, added_by, created_at")
        .order("created_at", { ascending: true }),
    ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-16">
      <h1 className="text-2xl font-mono font-bold tracking-tight">Admin</h1>

      <section className="space-y-4">
        <h2 className="text-base font-mono font-semibold border-b-2 border-on-background pb-2">
          Pending Review ({pendingEvents?.length ?? 0})
        </h2>
        {!pendingEvents?.length ? (
          <p className="text-sm font-mono text-muted-foreground">Queue is clear.</p>
        ) : (
          <ul className="divide-y divide-on-background">
            {pendingEvents.map((event) => {
              const approveAction = approveEvent.bind(null, event.id);
              const takedownAction = takedownEvent.bind(null, event.id);
              return (
                <li key={event.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {event.city} · {event.host_name} ·{" "}
                      {new Date(event.starts_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={approveAction}>
                      <Button type="submit" size="sm">Approve</Button>
                    </form>
                    <form action={takedownAction}>
                      <Button type="submit" size="sm" variant="destructive">Take Down</Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-mono font-semibold border-b-2 border-on-background pb-2">
          Live Events ({publishedEvents?.length ?? 0})
        </h2>
        {!publishedEvents?.length ? (
          <p className="text-sm font-mono text-muted-foreground">No live events.</p>
        ) : (
          <ul className="divide-y divide-on-background">
            {publishedEvents.map((event) => {
              const takedownAction = takedownEvent.bind(null, event.id);
              return (
                <li key={event.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {event.city} · {event.host_name} ·{" "}
                      {new Date(event.starts_at).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={takedownAction}>
                    <Button type="submit" size="sm" variant="destructive">Take Down</Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-mono font-semibold border-b-2 border-on-background pb-2">
          {BRAND.admin.whitelistHeading} ({whitelist?.length ?? 0})
        </h2>
        <p className="text-xs font-mono text-muted-foreground">{BRAND.admin.whitelistHint}</p>
        <form action={addToWhitelist} className="flex gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder={BRAND.admin.whitelistPlaceholder}
            className="flex-1 border-2 border-on-background bg-background px-3 py-2 font-mono text-sm"
          />
          <Button type="submit" size="sm">{BRAND.admin.whitelistAdd}</Button>
        </form>
        {!whitelist?.length ? (
          <p className="text-sm font-mono text-muted-foreground">{BRAND.admin.whitelistEmpty}</p>
        ) : (
          <ul className="divide-y divide-on-background">
            {whitelist.map((entry) => {
              const removeAction = removeFromWhitelist.bind(null, entry.email);
              return (
                <li key={entry.email} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{entry.email}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      added {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={removeAction}>
                    <Button type="submit" size="sm" variant="destructive">
                      {BRAND.admin.whitelistRemove}
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-mono font-semibold border-b-2 border-on-background pb-2">
          Members ({profiles?.length ?? 0})
        </h2>
        {!profiles?.length ? (
          <p className="text-sm font-mono text-muted-foreground">No members.</p>
        ) : (
          <ul className="divide-y divide-on-background">
            {profiles.map((profile) => {
              return (
                <li key={profile.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {profile.full_name ?? "(no name)"}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {profile.email}
                      {profile.is_admin && " · admin"}
                      {profile.is_trusted && " · trusted"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
