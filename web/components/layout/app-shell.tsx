import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="flex-1 pb-[72px] md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
}
