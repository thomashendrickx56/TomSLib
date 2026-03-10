import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() || "";
  const title = url.searchParams.get("title")?.trim() || "";
  const author = url.searchParams.get("author")?.trim() || "";
  const isbn = url.searchParams.get("isbn")?.trim() || "";
  const year = url.searchParams.get("year")?.trim() || "";
  const language = url.searchParams.get("language")?.trim() || "";
  const page = url.searchParams.get("page")?.trim() || "1";
  const sort = url.searchParams.get("sort")?.trim() || "relevance";

  if (!query && !title && !author && !isbn) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  try {
    const base = new URL("https://openlibrary.org/search.json");
    if (query) base.searchParams.set("q", query);
    if (title) base.searchParams.set("title", title);
    if (author) base.searchParams.set("author", author);
    if (isbn) base.searchParams.set("isbn", isbn);
    if (language) base.searchParams.set("language", language);
    base.searchParams.set("page", page);

    const res = await fetch(base, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Erreur Open Library" }, { status: 500 });
    }
    const data = await res.json();

    let docs = Array.isArray(data.docs) ? data.docs : [];
    if (year) {
      docs = docs.filter((d: any) => String(d.first_publish_year || "") === year);
    }
    if (language) {
      const lang = language.toLowerCase();
      docs = docs.filter((d: any) =>
        Array.isArray(d.language)
          ? d.language.some((l: string) => String(l).toLowerCase().includes(lang))
          : true
      );
    }

    // Sorting similar to TMDb style
    if (sort === "first_publish_year.desc") {
      docs.sort((a: any, b: any) => (b.first_publish_year || 0) - (a.first_publish_year || 0));
    } else if (sort === "first_publish_year.asc") {
      docs.sort((a: any, b: any) => (a.first_publish_year || 0) - (b.first_publish_year || 0));
    } else if (sort === "popularity.desc") {
      docs.sort((a: any, b: any) => (b.edition_count || 0) - (a.edition_count || 0));
    } else if (sort === "popularity.asc") {
      docs.sort((a: any, b: any) => (a.edition_count || 0) - (b.edition_count || 0));
    }

    const results = docs.slice(0, 30).map((d: any) => {
      const cover_url = typeof d.cover_i === "number"
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
        : null;
      const release_date = d.first_publish_year ? `${d.first_publish_year}-01-01` : "";
      const authors = Array.isArray(d.author_name) ? d.author_name : [];
      const popularity = d.edition_count || 0;
      return {
        id: String(d.key || ""),
        title: String(d.title || ""),
        overview: null,
        release_date,
        popularity,
        cover_url,
        authors,
      };
    });

    return NextResponse.json({ results }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur Open Library" }, { status: 500 });
  }
}
