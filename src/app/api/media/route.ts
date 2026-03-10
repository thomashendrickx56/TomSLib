import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function isAdmin(sessionEmail: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return false;
  return sessionEmail?.trim().toLowerCase() === adminEmail;
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!isAdmin(session.user.email)) {
    return NextResponse.json(
      { error: "Accès réservé à l’administrateur" },
      { status: 403 }
    );
  }

  let body: {
    title?: string;
    type?: string;
    drive_url?: string;
    description?: string;
    year?: number | null;
    age_rating?: string | null;
    genre?: string | null;
    cover_url?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide" },
      { status: 400 }
    );
  }

  const {
    title,
    type,
    drive_url,
    description,
    year,
    age_rating,
    genre,
    cover_url
  } = body;

  if (
    !title ||
    typeof title !== "string" ||
    !type ||
    !["movie", "book", "tv"].includes(type)
  ) {
    return NextResponse.json(
      { error: "Champs requis : title (string), type (movie|book|tv)" },
      { status: 400 }
    );
  }

  const fileUrl =
    drive_url && typeof drive_url === "string" ? drive_url.trim() : null;
  if (!fileUrl) {
    return NextResponse.json(
      {
        error:
          "Indiquez soit un fichier (upload Supabase), soit un lien externe (URL)."
      },
      { status: 400 }
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
  const { data, error } = await adminClient
    .from("media")
    .insert({
      type: type as "movie" | "book" | "tv",
      title: title.trim(),
      description: description?.trim() || null,
      drive_url: fileUrl,
      year: typeof year === "number" ? year : null,
      age_rating: age_rating ?? null,
      genre: genre ?? null,
      cover_url: cover_url ?? null
    })
    .select("id, title, type")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json(
      { error: error.message ?? "Erreur lors de l’enregistrement" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
