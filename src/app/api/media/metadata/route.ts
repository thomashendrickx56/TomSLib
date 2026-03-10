import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function isAdmin(sessionEmail: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return false;
  return sessionEmail?.trim().toLowerCase() === adminEmail;
}

type MediaType = "movie" | "book";

interface MetadataResult {
  title: string;
  year: number | null;
  genre: string | null;
  description: string | null;
  age_rating: string | null;
  cover_image: string | null;
}

function parseJsonFromText(text: string): MetadataResult | null {
  const cleaned = text.trim().replace(/```json?/, "").replace(/```$/, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    return {
      title: String(obj.title ?? "").trim(),
      year: obj.year != null ? Number(obj.year) || null : null,
      genre: obj.genre ? String(obj.genre).trim() : null,
      description: obj.description ? String(obj.description).trim() : null,
      age_rating: obj.age_rating ? String(obj.age_rating).trim() : null,
      cover_image: obj.cover_image ? String(obj.cover_image).trim() : null
    };
  } catch {
    return null;
  }
}

const ALLOWED_COVER_DOMAINS = [
  "upload.wikimedia.org",
  "covers.openlibrary.org",
  "image.tmdb.org",
];
const ALLOWED_IMG_EXT = [".jpg", ".jpeg", ".png", ".webp"];

function isAllowedCoverUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const hostOk = ALLOWED_COVER_DOMAINS.some((d) => u.hostname === d);
    const lowerPath = u.pathname.toLowerCase();
    const extOk = ALLOWED_IMG_EXT.some((ext) => lowerPath.endsWith(ext));
    return hostOk && extOk;
  } catch {
    return false;
  }
}

async function searchOpenLibraryCover(title: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(title);
    const res = await fetch(`https://openlibrary.org/search.json?title=${q}&limit=5`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = (data?.docs ?? []).find((d: any) => typeof d.cover_i === "number");
    if (!doc?.cover_i) return null;
    const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    return isAllowedCoverUrl(url) ? url : null;
  } catch {
    return null;
  }
}

async function searchTMDbPoster(title: string, year?: number | null): Promise<string | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  try {
    const q = encodeURIComponent(title);
    const y = year && Number.isFinite(year) ? `&year=${year}` : "";
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?query=${q}${y}&include_adult=false&language=fr-FR&page=1&api_key=${apiKey}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = (data?.results ?? []).find((r: any) => !!r.poster_path);
    if (!first?.poster_path) return null;
    const url = `https://image.tmdb.org/t/p/w500${first.poster_path}`;
    return isAllowedCoverUrl(url) ? url : null;
  } catch {
    return null;
  }
}

async function searchTMDbDetails(title: string, year?: number | null): Promise<{
  title?: string;
  year?: number | null;
  genre?: string | null;
  description?: string | null;
  poster_url?: string | null;
} | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  try {
    const q = encodeURIComponent(title);
    const y = year && Number.isFinite(year) ? `&year=${year}` : "";
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?query=${q}${y}&include_adult=false&language=fr-FR&page=1&api_key=${apiKey}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = (data?.results ?? [])[0];
    if (!first) return null;
    const poster_url = first.poster_path ? `https://image.tmdb.org/t/p/w500${first.poster_path}` : null;
    const yearOut = first.release_date ? Number(String(first.release_date).slice(0, 4)) : null;
    let genreName: string | null = null;
    try {
      const gRes = await fetch(`https://api.themoviedb.org/3/genre/movie/list?language=fr-FR&api_key=${apiKey}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const gJson = await gRes.json();
      const map: Record<number, string> = {};
      for (const g of gJson.genres ?? []) map[g.id] = g.name;
      const names = Array.isArray(first.genre_ids) ? first.genre_ids.map((id: number) => map[id]).filter(Boolean) : [];
      genreName = names[0] ?? null;
    } catch {
      genreName = null;
    }
    return {
      title: first.title || undefined,
      year: yearOut,
      genre: genreName,
      description: first.overview || null,
      poster_url,
    };
  } catch {
    return null;
  }
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

  let body: { title?: string; type?: MediaType };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide" },
      { status: 400 }
    );
  }

  const { title, type } = body;
  if (!title || typeof title !== "string" || !type || !["movie", "book"].includes(type)) {
    return NextResponse.json(
      { error: "Champs requis : title (string), type (movie|book)" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY non configurée" },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const kind = type === "movie" ? "film" : "livre";

    const prompt = `
Tu es un assistant spécialisé en cinéma et littérature.
Pour le ${kind} intitulé "${title}", renvoie STRICTEMENT un JSON (et rien d'autre) avec la structure suivante :
{
  "title": "Titre complet officiel",
  "year": 2000,
  "genre": "Genre principal en français",
  "description": "Description en français, 5 à 8 lignes, sans spoiler majeur.",
  "age_rating": "Âge conseillé (ex: Tous publics, 12+, 16+...)",
  "cover_image": "URL DIRECTE (terminant par .jpg/.jpeg/.png/.webp) vers une affiche/couverture provenant en priorité de upload.wikimedia.org, covers.openlibrary.org ou image.tmdb.org. Si aucune URL directe fiable n’est disponible, mets null."
}
Règles :
- Réponds UNIQUEMENT par ce JSON, sans texte autour.
- Si tu n'es pas sûr d'une valeur, mets null pour ce champ.
- N’inclus jamais d’URL vers des pages HTML, des proxys ou des redirections (ex: pages Wikipedia, TMDb page, etc.). Retourne uniquement un lien direct de fichier image sur les domaines recommandés, sinon null.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text() ?? "";
    const parsed = parseJsonFromText(text);

    if (!parsed) {
      return NextResponse.json(
        {
          title: title.trim(),
          year: null,
          genre: null,
          description: null,
          age_rating: null,
          cover_image: null,
          cover_candidates: []
        },
        { status: 200 }
      );
    }

    const candidates: string[] = [];
    if (isAllowedCoverUrl(parsed.cover_image)) {
      candidates.push(parsed.cover_image as string);
    }
    let tmdbDetails: Awaited<ReturnType<typeof searchTMDbDetails>> | null = null;
    if (type === "book") {
      const openLib = await searchOpenLibraryCover(parsed.title || title);
      if (openLib && !candidates.includes(openLib)) candidates.push(openLib);
    } else {
      tmdbDetails = await searchTMDbDetails(parsed.title || title, parsed.year);
      if (tmdbDetails?.poster_url && isAllowedCoverUrl(tmdbDetails.poster_url) && !candidates.includes(tmdbDetails.poster_url)) {
        candidates.push(tmdbDetails.poster_url);
      }
    }

    const safe = {
      title: parsed.title || tmdbDetails?.title || title.trim(),
      year: parsed.year != null ? parsed.year : (tmdbDetails?.year ?? null),
      genre: parsed.genre ?? (tmdbDetails?.genre ?? null),
      description: parsed.description ?? (tmdbDetails?.description ?? null),
      age_rating: parsed.age_rating ?? null,
      cover_image: isAllowedCoverUrl(parsed.cover_image)
        ? parsed.cover_image
        : (isAllowedCoverUrl(tmdbDetails?.poster_url || null) ? (tmdbDetails?.poster_url as string) : null),
      cover_candidates: candidates
    };
    return NextResponse.json(safe, { status: 200 });
  } catch (err) {
    console.error("Gemini metadata error:", err);
    return NextResponse.json(
      {
        title: title.trim(),
        year: null,
        genre: null,
        description: null,
        age_rating: null,
        cover_image: null,
        cover_candidates: []
      },
      { status: 200 }
    );
  }
}
