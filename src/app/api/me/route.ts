import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isEmailAllowed } from "@/config/allowedEmails";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    return NextResponse.json({ email: null, isAdmin: false, isAllowed: false });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin =
    !!adminEmail && session.user.email.trim().toLowerCase() === adminEmail;
  const isAllowed = isEmailAllowed(session.user.email);

  return NextResponse.json({
    email: session.user.email,
    isAdmin,
    isAllowed,
  });
}
