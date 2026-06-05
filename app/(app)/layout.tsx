import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { ProfileCompletion } from "@/components/layout/profile-completion";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Failsafe: create profile if auth trigger didn't fire
  if (!profile) {
    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: "",
        email: user.email ?? "",
        role: "member" as const,
        city: null,
      })
      .select()
      .single();

    profile = created;
  }

  // If profile exists but name is empty, show completion screen
  if (profile && profile.full_name === "") {
    return <ProfileCompletion profileId={profile.id} />;
  }

  return <AppShell>{children}</AppShell>;
}
