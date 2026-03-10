import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function isAdmin(sessionEmail: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return false;
  return sessionEmail?.trim().toLowerCase() === adminEmail;
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const {
    data: { session }
  } = await supabaseAuth.auth.getSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: "Accès réservé à l’administrateur" },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Configuration Supabase manquante" },
      { status: 500 }
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await adminClient.from("media").delete().eq("id", params.id);

  if (error) {
    console.error("Supabase delete error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

