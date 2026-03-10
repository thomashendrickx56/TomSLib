import { NextResponse } from "next/server";

function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out: any = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim();
  const year = url.searchParams.get("year")?.trim() || "";
  const genre = url.searchParams.get("genre")?.trim() || "";
  const sort = url.searchParams.get("sort")?.trim() || "popularity.desc";

  if (!query) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB_API_KEY manquante" }, { status: 500 });
  }

  try {
    const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("include_adult", "false");
    searchUrl.searchParams.set("language", "fr-FR");
    searchUrl.searchParams.set("page", "1");
    if (year) searchUrl.searchParams.set("year", year);
    searchUrl.searchParams.set("api_key", apiKey);

    const res = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Erreur TMDb" }, { status: 500 });
    }
    const data = await res.json();

    const genreMapRes = await fetch(`https://api.themoviedb.org/3/genre/movie/list?language=fr-FR&api_key=${apiKey}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const genreMapJson = await genreMapRes.json();
    const genreMap: Record<number, string> = {};
    for (const g of genreMapJson.genres ?? []) {
      genreMap[g.id] = g.name;
    }

    let results = (data.results ?? []).map((r: any) => {
      const poster_url = r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null;
      const genres = Array.isArray(r.genre_ids) ? r.genre_ids.map((id: number) => genreMap[id]).filter(Boolean) : [];
      return {
        ...pick(r, ["id", "title", "overview", "release_date", "vote_average", "popularity"]),
        poster_url,
        genres,
      };
    });

    if (genre) {
      results = results.filter((r: any) => (r.genres ?? []).map((x: string) => x.toLowerCase()).includes(genre.toLowerCase()));
    }

    if (sort === "vote_average.desc") {
      results.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sort === "vote_average.asc") {
      results.sort((a: any, b: any) => (a.vote_average || 0) - (b.vote_average || 0));
    } else if (sort === "popularity.asc") {
      results.sort((a: any, b: any) => (a.popularity || 0) - (b.popularity || 0));
    } else {
      results.sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Erreur serveur TMDb" }, { status: 500 });
  }
}
