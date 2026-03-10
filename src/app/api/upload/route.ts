import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BUCKET = "media";
const MAX_SIZE_MB = 500; // 500 Mo par fichier (films/livres)

function isAdmin(sessionEmail: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return false;
  return sessionEmail?.trim().toLowerCase() === adminEmail;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(request: Request) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const {
    data: { session },
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Champ 'file' requis (fichier)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)` },
      { status: 400 }
    );
  }

  const safeName = sanitizeFileName(file.name);
  const path = `${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("Supabase Storage upload error:", error);
    if (error.message?.includes("Bucket not found")) {
      return NextResponse.json(
        {
          error:
            "Bucket 'media' introuvable. Crée un bucket public nommé 'media' dans Supabase (Storage).",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error.message ?? "Erreur lors de l’upload" },
      { status: 500 }
    );
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${data.path}`;
  return NextResponse.json({ url: publicUrl, path: data.path });
}
