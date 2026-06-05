"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";

type Step = "email" | "otp";
type ErrorKind = "generic" | "rate_limit" | "spam_hint" | null;

const ERROR_MESSAGES: Record<NonNullable<ErrorKind>, string> = {
  generic: "Something went wrong. Try again.",
  rate_limit: "Too many attempts. Wait a few minutes.",
  spam_hint: "Didn't get the code? Check spam or try again in 60s.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorKind>(null);
  const [cooldown, setCooldown] = useState(0);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown() {
    setCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!email.trim() || loading || cooldown > 0) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({ email });

    setLoading(false);

    if (authError) {
      if (authError.status === 429) {
        setError("rate_limit");
      } else {
        setError("generic");
      }
      return;
    }

    setStep("otp");
    startCooldown();
  }, [email, loading, cooldown]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otp.trim() || loading) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    setLoading(false);

    if (authError) {
      if (authError.status === 429) {
        setError("rate_limit");
      } else {
        setError("generic");
      }
      return;
    }

    router.push(returnTo);
  }, [email, otp, loading, returnTo, router]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || loading) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({ email });

    setLoading(false);

    if (authError) {
      if (authError.status === 429) {
        setError("rate_limit");
      } else {
        setError("generic");
      }
      return;
    }

    startCooldown();
    setError("spam_hint");
  }, [email, cooldown, loading]);

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* Left: Hero panel */}
      <div className="bg-secondary-container flex items-center justify-center p-stack-lg lg:p-stack-xl lg:w-2/3">
        <h1 className="text-headline-lg lg:text-display-xl font-serif font-black uppercase text-on-background max-w-[600px]">
          {BRAND.hero.heading.toUpperCase()}
        </h1>
      </div>

      {/* Right: Auth card */}
      <div className="dot-grid flex-1 flex items-center justify-center p-stack-md lg:p-stack-lg">
        <div className="border-4 border-on-background hard-shadow bg-surface p-stack-lg w-full max-w-[400px]">
          <h2 className="text-headline-md font-serif font-bold text-on-background mb-6">
            {BRAND.hero.authCard}
          </h2>

          {/* Email input */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="text-label-mono font-mono uppercase font-semibold text-on-background block mb-2"
            >
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && step === "email") handleSendCode();
              }}
              disabled={step === "otp"}
              className="border-2 border-on-background bg-surface w-full p-3 font-sans text-body-md focus:border-primary outline-none disabled:opacity-50"
            />
          </div>

          {/* OTP input */}
          {step === "otp" && (
            <div className="mb-4">
              <label
                htmlFor="otp"
                className="text-label-mono font-mono uppercase font-semibold text-on-background block mb-2"
              >
                CODE
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyOtp();
                }}
                className="border-2 border-on-background bg-surface w-full p-3 font-sans text-body-md focus:border-primary outline-none tracking-[0.3em]"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-body-md font-sans text-[#b00020] mb-4">
              {ERROR_MESSAGES[error]}
            </p>
          )}

          {/* Primary action button */}
          {step === "email" ? (
            <button
              onClick={handleSendCode}
              disabled={loading || !email.trim()}
              className="bg-primary text-on-primary border-2 border-on-background w-full py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "SENDING..." : BRAND.hero.authButton}
            </button>
          ) : (
            <>
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
                className="bg-primary text-on-primary border-2 border-on-background w-full py-3 font-mono text-label-mono uppercase font-semibold hard-shadow hard-shadow-hover hard-shadow-active disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? "VERIFYING..." : "VERIFY"}
              </button>

              {/* Resend / cooldown */}
              <div className="mt-4 text-center">
                {cooldown > 0 ? (
                  <span className="text-label-mono font-mono uppercase font-semibold text-on-background/60">
                    RESEND IN {cooldown}S
                  </span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="text-label-mono font-mono uppercase font-semibold text-primary underline underline-offset-4 disabled:opacity-50"
                  >
                    RESEND CODE
                  </button>
                )}
              </div>
            </>
          )}

          {/* Back to email step */}
          {step === "otp" && (
            <button
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
              }}
              className="mt-4 w-full text-center text-label-mono font-mono uppercase font-semibold text-on-background/60 underline underline-offset-4"
            >
              USE DIFFERENT EMAIL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
