import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canHost = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_trusted")
      .eq("id", user.id)
      .single();
    canHost = !!profile?.is_trusted;
  }

  return (
    <>
      <TopNav canHost={canHost} />
      <main className="flex-1 pb-[72px] md:pb-0">{children}</main>
      <Footer />
      <MobileNav canHost={canHost} />
    </>
  );
}
