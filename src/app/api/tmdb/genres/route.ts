import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY manquante" }, { status: 500 });
  }
  try {
    const res = await fetch(`https://api.themoviedb.org/3/genre/movie/list?language=fr-FR&api_key=${apiKey}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Erreur TMDb" }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json({ genres: data.genres ?? [] }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur TMDb" }, { status: 500 });
  }
}
