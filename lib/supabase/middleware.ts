import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public paths accessible without authentication.
// Event detail (/e/), ticket pages (/t/), login, not-allowed, OG image
// routes, and API routes must all pass through without redirect.
// API routes handle their own auth — middleware must not redirect them.
const PUBLIC_PATH_PREFIXES = [
  "/api/",
  "/e/",
  "/t/",
  "/login",
  "/auth",
  "/not-allowed",
] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session -- important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public paths bypass the allowlist gate entirely.
  // Anon visitors can view event pages and ticket pages.
  if (isPublicPath(path)) {
    return supabaseResponse;
  }

  // Unauthenticated users trying to access gated routes go to login.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
