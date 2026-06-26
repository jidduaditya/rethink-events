import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const DEV_PASSWORD = "123456";

// Uses the service role key to set/reset any user's password to the dev
// password, then the client-side can signInWithPassword normally.
// This route must never exist in production.
export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Find the user by email.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const existing = list.users.find((u) => u.email === email);

  if (existing) {
    // User exists — update their password to the dev password.
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: DEV_PASSWORD,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // User doesn't exist — create them.
    const { error } = await supabase.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
