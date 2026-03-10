"use client";

import { MouseEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import type { Media, MediaType } from "@/types/media";

type Filter = "all" | MediaType;

export default function DashboardPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [sort, setSort] = useState<"title_asc" | "year_desc" | "year_asc">("title_asc");
  const [tvSearch, setTvSearch] = useState("");
  const [olResults, setOlResults] = useState<
    Array<{
      id: string;
      title: string;
      overview: string | null;
      release_date: string;
      popularity: number;
      cover_url: string | null;
      authors: string[];
    }>
  >([]);
  const [olLoading, setOlLoading] = useState(false);
  const [olAuthor, setOlAuthor] = useState<string>("");
  const [olYear, setOlYear] = useState<string>("");
  const [olLang, setOlLang] = useState<string>("all");

  useEffect(() => {
    const fetchMedia = async () => {
      const { data, error } = await supabase
        .from("media")
        .select("id, type, title, description, drive_url, year, genre, cover_url")
        .order("title");

      if (error) {
        console.error(error);
        setMedia([]);
      } else {
        setMedia((data as Media[]) ?? []);
      }
      setLoading(false);
    };
    fetchMedia();
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => setIsAdmin(!!data.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  const handleDelete = async (
    e: MouseEvent<HTMLButtonElement>,
    id: string,
    title: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Supprimer « ${title} » du catalogue ?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || "Erreur lors de la suppression");
        alert(data.error || "Erreur lors de la suppression");
        return;
      }
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const genres = useMemo(() => {
    const s = new Set<string>();
    for (const m of media) {
      if (m.genre) s.add(m.genre);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [media]);

  const years = useMemo(() => {
    const s = new Set<number>();
    for (const m of media) {
      if (typeof m.year === "number") s.add(m.year);
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [media]);

  const filtered = useMemo(() => {
    let base =
      filter === "all"
        ? media.filter((m) => m.type !== "tv")
        : media.filter((m) => m.type === filter);
    const q = search.trim().toLowerCase();
    if (q) base = base.filter((m) => m.title.toLowerCase().includes(q));
    if (genre !== "all") base = base.filter((m) => (m.genre || "").toLowerCase() === genre.toLowerCase());
    if (year !== "all") base = base.filter((m) => String(m.year || "") === year);
    const sorted = [...base];
    if (sort === "title_asc") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "year_desc") {
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === "year_asc") {
      sorted.sort((a, b) => (a.year || 0) - (b.year || 0));
    }
    return sorted;
  }, [media, filter, search, genre, year, sort]);

  useEffect(() => {
    const controller = new AbortController();
    const q = search.trim();
    if (filter !== "book" || q.length < 2) {
      setOlResults([]);
      setOlLoading(false);
      return;
    }
    setOlLoading(true);
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("query", q);
      if (olAuthor) params.set("author", olAuthor);
      if (olYear) params.set("year", olYear);
      if (olLang !== "all") params.set("language", olLang);
      params.set("sort", "popularity.desc");
      const res = await fetch(`/api/openlibrary/search?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setOlResults(Array.isArray(data.results) ? data.results : []);
      setOlLoading(false);
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [filter, search, olAuthor, olYear, olLang]);

  return (
    <>
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold text-slate-50">
          Catalogue
        </h1>
        <p className="text-slate-400">
          Films, livres et TV — clique sur une carte pour ouvrir la fiche et le
          lecteur.
        </p>
      </div>

      
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex gap-2 rounded-lg bg-slate-900/60 p-1">
        {(["all", "movie", "book", "tv"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-slate-700 text-slate-50"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {f === "all"
              ? "Tous"
              : f === "movie"
              ? "Films"
              : f === "book"
              ? "Livres"
              : "TV"}
          </button>
        ))}
        </div>
        {filter !== "tv" ? (
          <div className="flex w-full max-w-md items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un titre…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
            />
            <button
              type="button"
              onClick={() => setSearch(search.trim())}
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
            >
              Rechercher
            </button>
          </div>
        ) : (
          <div className="flex w-full max-w-md items-center gap-2">
            <input
              type="text"
              value={tvSearch}
              onChange={(e) => setTvSearch(e.target.value)}
              placeholder="Rechercher une chaîne TV…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
            />
            <button
              type="button"
              onClick={() => setTvSearch(tvSearch.trim())}
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
            >
              Rechercher
            </button>
          </div>
        )}
      </div>

      {filter === "book" && search.trim().length >= 2 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-50">Résultats Open Library</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={olAuthor}
                onChange={(e) => setOlAuthor(e.target.value)}
                placeholder="Auteur"
                className="w-36 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
              />
              <input
                type="number"
                value={olYear}
                onChange={(e) => setOlYear(e.target.value)}
                placeholder="Année"
                className="w-24 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
              />
              <select
                value={olLang}
                onChange={(e) => setOlLang(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
              >
                <option value="all">Toutes langues</option>
                <option value="fre">Français</option>
                <option value="eng">Anglais</option>
                <option value="spa">Espagnol</option>
                <option value="deu">Allemand</option>
                <option value="ita">Italien</option>
              </select>
            </div>
          </div>
          {olLoading ? (
            <p className="text-slate-400">Recherche Open Library…</p>
          ) : olResults.length === 0 ? (
            <p className="text-slate-400">Aucun résultat.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {olResults.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/60">
                  <div className="relative aspect-[3/4] bg-slate-800">
                    {r.cover_url ? (
                      <Image
                        src={r.cover_url}
                        alt={r.title}
                        fill
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-4xl text-slate-600">📖</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-100 line-clamp-2">{r.title}</h3>
                    <p className="text-xs text-slate-400">
                      {(r.authors || []).join(", ")}
                      {r.release_date ? ` • ${new Date(r.release_date).getFullYear()}` : ""}
                    </p>
                    {r.overview && (
                      <p className="mt-2 line-clamp-3 text-sm text-slate-300">{r.overview}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/book/${encodeURIComponent(r.id)}`}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:border-slate-600"
                      >
                        Voir la fiche
                      </Link>
                      <Link
                        href={`/admin?ol_title=${encodeURIComponent(r.title)}&ol_year=${encodeURIComponent(
                          r.release_date ? String(new Date(r.release_date).getFullYear()) : ""
                        )}&ol_author=${encodeURIComponent((r.authors || []).join(", "))}&ol_cover=${encodeURIComponent(
                          r.cover_url || ""
                        )}`}
                        className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
                      >
                        Ajouter
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Genre</span>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
          >
            <option value="all">Tous</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Année</span>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
          >
            <option value="all">Toutes</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Trier</span>
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "title_asc" | "year_desc" | "year_asc")
            }
            className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
          >
            <option value="title_asc">Titre A→Z</option>
            <option value="year_desc">Année ↓</option>
            <option value="year_asc">Année ↑</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
          Aucun contenu pour le moment. Les entrées ajoutées via le formulaire
          admin apparaîtront ici.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              {item.type !== "tv" ? (
                <Link
                  href={`/media/${item.id}`}
                  className="group relative block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition hover:border-slate-600 hover:bg-slate-800/60"
                >
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item.id, item.title)}
                      className="absolute right-2 top-2 z-10 rounded-full bg-red-500/90 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition group-hover:opacity-100"
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? "…" : "Supprimer"}
                    </button>
                  )}
                  <div className="relative aspect-[3/4] bg-slate-800">
                    {item.cover_url ? (
                      <Image
                        src={item.cover_url}
                        alt={item.title}
                        fill
                        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-4xl text-slate-600">
                          {item.type === "movie" ? "🎬" : "📖"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-sky-400">
                      {item.type === "movie" ? "Film" : "Livre"}
                      {item.year && (
                        <span className="ml-2 text-[11px] font-normal text-slate-400">
                          • {item.year}
                        </span>
                      )}
                    </span>
                    <h2 className="font-semibold text-slate-100 line-clamp-2">
                      {item.title}
                    </h2>
                    {item.genre && (
                      <p className="mt-1 text-xs text-slate-400">
                        {item.genre}
                      </p>
                    )}
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              ) : (
                <TvCard
                  item={item}
                  isAdmin={isAdmin}
                  deletingId={deletingId}
                  onDelete={(e) => handleDelete(e, item.id, item.title)}
                  searchTerm={tvSearch}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TvCard({
  item,
  isAdmin,
  deletingId,
  onDelete,
  searchTerm = "",
}: {
  item: Media;
  isAdmin: boolean;
  deletingId: string | null;
  onDelete: (e: MouseEvent<HTMLButtonElement>) => void;
  searchTerm?: string;
}) {
  const [channels, setChannels] = useState<Array<{ name: string; url: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setError(null);
      setChannels([]);
      try {
        const res = await fetch(item.drive_url, { cache: "no-store" });
        if (!res.ok) {
          setError("Impossible de charger le fichier M3U.");
          return;
        }
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        const parsed: Array<{ name: string; url: string }> = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("#EXTINF")) {
            const commaIdx = line.lastIndexOf(",");
            const name = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : "Chaîne";
            let j = i + 1;
            while (j < lines.length && (lines[j].trim() === "" || lines[j].trim().startsWith("#"))) {
              j++;
            }
            const url = j < lines.length ? lines[j].trim() : "";
            if (url && /^https?:\/\//i.test(url)) {
              parsed.push({ name, url });
            }
          }
        }
        setChannels(parsed);
      } catch {
        setError("Erreur de lecture du fichier M3U.");
      }
    };
    run();
  }, [item.drive_url]);

  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-900/60">
      {isAdmin && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-2 top-2 z-10 rounded-full bg-red-500/90 px-2 py-1 text-xs font-medium text-white shadow-sm"
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? "…" : "Supprimer"}
        </button>
      )}
      <div className="p-4">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-sky-400">
          TV
        </span>
        <h2 className="font-semibold text-slate-100">{item.title || "TV"}</h2>
        {error ? (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        ) : channels.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">Chargement des chaînes…</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {channels
              .filter((ch) => {
                const q = searchTerm.trim().toLowerCase();
                if (!q) return true;
                return (
                  ch.name.toLowerCase().includes(q) ||
                  ch.url.toLowerCase().includes(q)
                );
              })
              .slice(0, 24)
              .map((ch) => (
              <li key={`${ch.name}-${ch.url}`}>
                <a
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 hover:border-slate-600"
                  title={ch.url}
                >
                  {ch.name}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-3">
          <Link
            href={`/media/${item.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
          >
            Ouvrir la fiche
          </Link>
          <a
            href={item.drive_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500 px-4 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/10"
          >
            Ouvrir la playlist
          </a>
        </div>
      </div>
    </div>
  );
}
