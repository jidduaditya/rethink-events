"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { PageThemeToggle } from "@/components/layout/page-theme-toggle";

const DEV_PASSWORD = "123456";

const SAMPLE_EVENTS = [
  {
    title: "Design Systems & Chaos",
    time: "19:00",
    city: "Berlin",
    color: "bg-primary-container",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD3f2DoXmOhBRgYjMoTJu7wpcIBAlHU523QbkMkRDNN1erSm_AfhwBrnzL6s7JMCYo5gDhgxRwqggZvDuNnuEJK0TmLqgSxgX583QMJcHr9ebx2DqmA4PJhitl4V_L8bBi_xzPyMG_OWiXe7DFqKLVQ9K5e36AQq2MznQn2Vt3_FrGyXYHdhYMfIbSen926Jl78bTkWGCbFHaRys3oZFD0rDmvjb0Yplsu_yViLoRw1boDYdgksRgVA_1vq6dSGyHeio3hPADi9M-f7",
    badge: "Live",
  },
  {
    title: "Frontend Architecture",
    time: "18:30",
    city: "London",
    color: "bg-secondary-container",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBaY1LESmUDrG2JTxeIYmvC9YgIaP91xi7JJBGvlSZg-EO98uU74S-C3P6DGo0YL3584tMPph89ex7rUyx0LCDrHwkhSOgPgYSXCfpRSQj8YQHGvPfpUqVCbkl7CNs3_siDPYIDVmrnzFYMYAUT1X7KhCoUm9zz1c12RasCPJsxWwT7DTVqGrhKCPPzoGy_E-x2Syewbdjw1IQJoTbopcKVu0Yng5eHVnmI2P2ETJGzv9WB19ZlcvQB5Ga-ywGq4CVZI6gJOKiZf3-a",
    badge: null,
  },
  {
    title: "WebAssembly Now",
    time: "20:00",
    city: "Remote",
    color: "bg-tertiary-container",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDjnZlHGgYlo4oB7TklW8MbD3koGmrmgR7Q3ZoXk1GYvT-aWodoR9hlHu9hJi2mg5YqHYYstGnlaBF3oGSfNdi4P7MAwoc4HAf3r-z8Ifp6hVKRJZo9HgXzzBIl1wBwEVkz--Zcqcm1d1ywpJwhUJ-1k0lxaCpFzLSIFpieiqnLZq2erruLAKa9gTO4PEymIjtEUHqXDCs-dZU8SnfQncwJTB76GNXY7lZTzMnpFOOFIgXGei1dcPynWytaCt8ztanP9ASftJR7M9k_",
    badge: null,
  },
];

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface" />
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);

    // Server route sets (or resets) the password for this email via the
    // service role key, handling both new and OTP-created existing accounts.
    const prep = await fetch("/api/dev-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (!prep.ok) {
      const { error: msg } = await prep.json();
      setError(msg ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: DEV_PASSWORD,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(returnTo);
    router.refresh();
  }, [email, loading, returnTo, router]);

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-on-background antialiased">
      {/* TopNav */}
      <nav className="sticky top-0 z-50 bg-surface border-b-4 border-on-background">
        <div className="flex justify-between items-center w-full px-grid-margin h-20">
          <div className="font-serif text-headline-lg font-black tracking-tighter text-on-background">
            RETHINK
          </div>
          <div className="hidden md:flex gap-grid-gutter font-sans text-body-md uppercase tracking-tighter">
            <span className="text-primary underline decoration-4 underline-offset-8">
              Events
            </span>
            <span className="text-on-background hover:bg-secondary-container transition-colors px-2 cursor-pointer">
              Cities
            </span>
            <span className="text-on-background hover:bg-secondary-container transition-colors px-2 cursor-pointer">
              Organise
            </span>
          </div>
          <PageThemeToggle />
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 border-b-4 border-on-background">
          <div className="lg:col-span-8 bg-secondary-container p-grid-margin border-r-0 lg:border-r-4 border-on-background flex items-center">
            <h1 className="font-serif text-[clamp(48px,7.2vw,112px)] leading-[0.95] tracking-[-0.04em] font-black text-on-background uppercase">
              Amazing events. Amazing people. Amazing chats.
            </h1>
          </div>

          <div className="lg:col-span-4 bg-surface p-grid-margin dot-grid flex flex-col justify-center">
            <div className="bg-surface border-4 border-on-background p-stack-lg hard-shadow w-full max-w-md mx-auto">
              <h2 className="font-serif text-headline-md mb-stack-lg font-bold uppercase">
                Log in to the Rethinkverse now!
              </h2>

              <form
                className="space-y-stack-md"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
              >
                <div>
                  <label className="font-mono text-label-mono block mb-stack-xs uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface border-2 border-on-background p-3 font-sans text-body-md focus:border-primary focus:ring-0 placeholder-on-surface-variant"
                  />
                </div>

                {error && (
                  <p className="font-sans text-body-md text-error">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-primary text-on-primary font-mono text-label-mono uppercase p-4 border-2 border-on-background hard-shadow transition-transform hard-shadow-hover mt-stack-md disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? "LOGGING IN..." : "LOG IN"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* WHAT'S ON */}
        <section className="p-grid-margin border-b-4 border-on-background bg-surface-container-low">
          <div className="flex justify-between items-end mb-stack-lg border-b-4 border-on-background pb-stack-md">
            <h2 className="font-serif text-headline-lg uppercase">
              What&apos;s on
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-grid-gutter">
            {SAMPLE_EVENTS.map((evt) => (
              <article
                key={evt.title}
                className="bg-surface border-4 border-on-background flex flex-col hard-shadow hard-shadow-hover transition-transform group cursor-pointer"
              >
                <div
                  className={`relative w-full aspect-[16/9] border-b-4 border-on-background overflow-hidden ${evt.color}`}
                >
                  <Image
                    src={evt.image}
                    alt={evt.title}
                    fill
                    className="object-cover w-full h-full mix-blend-luminosity opacity-80 group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  {evt.badge && (
                    <div className="absolute top-4 left-4 bg-tertiary text-on-tertiary px-3 py-1 font-mono text-label-data uppercase border-2 border-on-background">
                      {evt.badge}
                    </div>
                  )}
                </div>
                <div className="p-stack-md flex flex-col flex-grow">
                  <h3 className="font-serif text-headline-md mb-stack-sm group-hover:text-primary transition-colors">
                    {evt.title}
                  </h3>
                  <div className="mt-auto pt-stack-sm border-t-2 border-on-background flex justify-between font-mono text-label-data uppercase">
                    <span>{evt.time}</span>
                    <span>{evt.city}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Manifesto */}
        <section className="bg-primary text-on-primary border-b-4 border-on-background px-grid-margin py-stack-xl text-center flex flex-col items-center justify-center">
          <p className="font-serif text-headline-lg max-w-5xl mx-auto italic font-black leading-tight">
            &quot;{BRAND.manifesto}&quot;
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-on-background border-t-4 border-on-background w-full">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-grid-gutter px-grid-margin py-stack-xl items-center">
          <div className="md:col-span-6 font-serif text-headline-lg font-black text-surface uppercase tracking-tighter">
            RETHINK
          </div>
          <div className="md:col-span-6 flex flex-col md:items-end gap-stack-md font-mono text-label-mono uppercase">
            <div className="flex gap-grid-gutter">
              {BRAND.footer.links.map((link) => (
                <span
                  key={link}
                  className="text-surface hover:text-tertiary-fixed-dim transition-colors cursor-pointer"
                >
                  {link}
                </span>
              ))}
            </div>
            <div className="text-surface opacity-70">
              {BRAND.footer.copyright}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
