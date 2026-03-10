"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type FormState = "idle" | "loading" | "success" | "error";
type SourceType = "file" | "url";

interface MetadataState {
  title: string;
  year: string;
  genre: string;
  description: string;
  age_rating: string;
  cover_url: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"movie" | "book" | "tv">("movie");
  const [sourceType, setSourceType] = useState<SourceType>("file");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [metadata, setMetadata] = useState<MetadataState | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [coverSuggestions, setCoverSuggestions] = useState<string[]>([]);
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<
    Array<{
      id: number;
      title: string;
      overview: string;
      release_date: string;
      vote_average: number;
      popularity: number;
      poster_url: string | null;
      genres: string[];
    }>
  >([]);
  const [tmdbGenre, setTmdbGenre] = useState<string>("all");
  const [tmdbYear, setTmdbYear] = useState<string>("");
  const [tmdbSort, setTmdbSort] = useState<string>("popularity.desc");
  const [olQuery, setOlQuery] = useState("");
  const [olLoading, setOlLoading] = useState(false);
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
  const [olAuthor, setOlAuthor] = useState<string>("");
  const [olYear, setOlYear] = useState<string>("");
  const [olLang, setOlLang] = useState<string>("all");

  useEffect(() => {
    const check = async () => {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (!data.isAdmin) {
        router.replace("/dashboard");
        return;
      }
      setAllowed(true);
      const params = new URLSearchParams(window.location.search);
      const olTitle = params.get("ol_title") || "";
      const olYear = params.get("ol_year") || "";
      const olCover = params.get("ol_cover") || "";
      const olOverview = params.get("ol_overview") || "";
      if (olTitle) {
        setType("book");
        setTitle(olTitle);
        setMetadata({
          title: olTitle,
          year: olYear,
          genre: "",
          description: olOverview,
          age_rating: "",
          cover_url: olCover
        });
      }
    };
    check();
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    const q = olQuery.trim();
    if (q.length < 2) {
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
  }, [olQuery, olAuthor, olYear, olLang]);

  const applyOlToForm = (r: {
    id: string;
    title: string;
    overview: string | null;
    release_date: string;
    cover_url: string | null;
    authors: string[];
  }) => {
    try {
      setType("book");
      setTitle(r.title || "");
      const yearOut = r.release_date ? String(new Date(r.release_date).getFullYear()) : "";
      const cover = r.cover_url || "";
      setMetadata({
        title: r.title || "",
        year: yearOut,
        genre: "",
        description: r.overview || "",
        age_rating: "",
        cover_url: cover
      });
      const suggestions: string[] = [];
      if (cover) suggestions.push(cover);
      setCoverSuggestions(suggestions);
      setMessage("Formulaire pré-rempli avec Open Library. Vérifie les champs puis publie.");
      setFormState("idle");
    } catch {
      setMessage("Impossible de pré-remplir depuis Open Library.");
      setFormState("error");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const q = tmdbQuery.trim();
    if (q.length < 2) {
      setTmdbResults([]);
      setTmdbLoading(false);
      return;
    }
    setTmdbLoading(true);
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("query", q);
      if (tmdbYear) params.set("year", tmdbYear);
      if (tmdbGenre !== "all") params.set("genre", tmdbGenre);
      if (tmdbSort) params.set("sort", tmdbSort);
      const res = await fetch(`/api/tmdb/search?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setTmdbResults(Array.isArray(data.results) ? data.results : []);
      setTmdbLoading(false);
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [tmdbQuery, tmdbGenre, tmdbYear, tmdbSort]);

  const applyTmdbToForm = (r: {
    title: string;
    overview: string;
    release_date: string;
    poster_url: string | null;
    genres: string[];
  }) => {
    try {
      setType("movie");
      setTitle(r.title || "");
      const yearOut = r.release_date ? String(new Date(r.release_date).getFullYear()) : "";
      const genreOut = r.genres?.[0] ?? "";
      const cover = r.poster_url || "";
      setMetadata({
        title: r.title || "",
        year: yearOut,
        genre: genreOut,
        description: r.overview || "",
        age_rating: "",
        cover_url: cover
      });
      const suggestions: string[] = [];
      if (cover) suggestions.push(cover);
      setCoverSuggestions(suggestions);
      setMessage("Formulaire pré-rempli avec TMDb. Vérifie les champs puis publie.");
      setFormState("idle");
    } catch {
      setMessage("Impossible de pré-remplir depuis TMDb.");
      setFormState("error");
    }
  };

  const handleGenerateMetadata = async () => {
    setMessage("");
    setMetadata(null);
    if (!title.trim()) {
      setMessage("Renseigne d’abord un titre.");
      return;
    }
    setLoadingMetadata(true);
    try {
      const res = await fetch("/api/media/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), type })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Erreur lors de la génération IA.");
        return;
      }
      const suggestions: string[] = Array.isArray(data.cover_candidates)
        ? data.cover_candidates.filter((u: unknown) => typeof u === "string")
        : [];
      setCoverSuggestions(suggestions);
      setMetadata({
        title: data.title ?? title.trim(),
        year: data.year != null ? String(data.year) : "",
        genre: data.genre ?? "",
        description: data.description ?? "",
        age_rating: data.age_rating ?? "",
        cover_url: data.cover_image ?? (suggestions[0] ?? "")
      });
    } catch {
      setMessage("Erreur lors de l’appel à l’IA.");
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    setFormState("loading");
    setMessage("");

    let fileUrl: string;

    try {
      if (sourceType === "file" && file) {
        const formData = new FormData();
        formData.set("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setMessage(uploadData.error ?? "Erreur lors de l’upload");
          setFormState("error");
          return;
        }
        fileUrl = uploadData.url;
      } else if (sourceType === "url" && externalUrl.trim()) {
        fileUrl = externalUrl.trim();
      } else {
        setMessage(
          sourceType === "file"
            ? "Choisis un fichier à uploader."
            : "Saisis un lien externe."
        );
        setFormState("error");
        return;
      }

      const effectiveMeta: MetadataState = metadata ?? {
        title: title.trim(),
        year: "",
        genre: "",
        description: "",
        age_rating: "",
        cover_url: ""
      };

      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: effectiveMeta.title || title.trim(),
          type,
          drive_url: fileUrl,
          description: effectiveMeta.description || null,
          year: effectiveMeta.year ? Number(effectiveMeta.year) : null,
          age_rating: effectiveMeta.age_rating || null,
          genre: effectiveMeta.genre || null,
          cover_url: effectiveMeta.cover_url || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error ?? "Erreur lors de l’ajout");
        setFormState("error");
        return;
      }

      setMessage(`${data.title} a été ajouté au catalogue.`);
      setFormState("success");
      setTitle("");
      setFile(null);
      setExternalUrl("");
      setMetadata(null);
    } catch {
      setMessage("Erreur réseau.");
      setFormState("error");
    }
  };

  if (allowed === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Vérification…
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">
          Ajouter un film, un livre ou une playlist TV
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          1) Renseigne le titre et la source, 2) laisse l’IA pré-remplir la
          fiche, 3) corrige au besoin puis publie.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-50">Recherche TMDb (admin)</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tmdbGenre}
              onChange={(e) => setTmdbGenre(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
            >
              <option value="all">Tous les genres</option>
              <option value="Action">Action</option>
              <option value="Aventure">Aventure</option>
              <option value="Animation">Animation</option>
              <option value="Comédie">Comédie</option>
              <option value="Drame">Drame</option>
              <option value="Fantastique">Fantastique</option>
              <option value="Science-Fiction">Science-Fiction</option>
              <option value="Thriller">Thriller</option>
              <option value="Horreur">Horreur</option>
              <option value="Romance">Romance</option>
            </select>
            <input
              type="number"
              value={tmdbYear}
              onChange={(e) => setTmdbYear(e.target.value)}
              placeholder="Année"
              className="w-24 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
            />
            <select
              value={tmdbSort}
              onChange={(e) => setTmdbSort(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-sm text-slate-50"
            >
              <option value="popularity.desc">Popularité ↓</option>
              <option value="popularity.asc">Popularité ↑</option>
              <option value="vote_average.desc">Note ↓</option>
              <option value="vote_average.asc">Note ↑</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tmdbQuery}
            onChange={(e) => setTmdbQuery(e.target.value)}
            placeholder="Rechercher un film sur TMDb…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
          />
          <button
            type="button"
            onClick={() => setTmdbQuery(tmdbQuery.trim())}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-50 hover:bg-slate-600"
          >
            Rechercher
          </button>
        </div>
        {tmdbQuery.trim().length >= 2 && (
          <div className="mt-4">
            {tmdbLoading ? (
              <p className="text-slate-400">Recherche TMDb…</p>
            ) : tmdbResults.length === 0 ? (
              <p className="text-slate-400">Aucun résultat.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {tmdbResults.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/60">
                    <div className="relative aspect-[16/9] bg-slate-800">
                      {r.poster_url ? (
                        <Image
                          src={r.poster_url}
                          alt={r.title}
                          fill
                          sizes="(min-width:640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-4xl text-slate-600">🎬</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-100 line-clamp-2">{r.title}</h3>
                        <span className="rounded-md border border-slate-700 px-2 py-px text-xs text-slate-200">
                          {r.vote_average?.toFixed(1) ?? "—"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {r.release_date ? new Date(r.release_date).getFullYear() : "N/A"}
                        {r.genres?.length ? ` • ${r.genres.join(", ")}` : ""}
                      </p>
                      {r.overview && (
                        <p className="mt-2 line-clamp-3 text-sm text-slate-300">{r.overview}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => applyTmdbToForm(r)}
                          className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
                        >
                          Pré-remplir le formulaire
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-50">Recherche Open Library (admin)</h2>
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={olQuery}
            onChange={(e) => setOlQuery(e.target.value)}
            placeholder="Rechercher un livre sur Open Library…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
          />
          <button
            type="button"
            onClick={() => setOlQuery(olQuery.trim())}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-50 hover:bg-slate-600"
          >
            Rechercher
          </button>
        </div>
        {olQuery.trim().length >= 2 && (
          <div className="mt-4">
            {olLoading ? (
              <p className="text-slate-400">Recherche Open Library…</p>
            ) : olResults.length === 0 ? (
              <p className="text-slate-400">Aucun résultat.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {olResults.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/60">
                    <div className="relative aspect-[3/4] bg-slate-800">
                      {r.cover_url ? (
                        <Image
                          src={r.cover_url}
                          alt={r.title}
                          fill
                          sizes="(min-width:640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-4xl text-slate-600">📖</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-100 line-clamp-2">{r.title}</h3>
                        <span className="rounded-md border border-slate-700 px-2 py-px text-xs text-slate-200">
                          {r.release_date ? new Date(r.release_date).getFullYear() : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {(r.authors || []).join(", ")}
                      </p>
                      {r.overview && (
                        <p className="mt-2 line-clamp-3 text-sm text-slate-300">{r.overview}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => applyOlToForm(r)}
                          className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
                        >
                          Pré-remplir le formulaire
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handlePublish}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">
            Titre
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-50 placeholder-slate-500 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
            placeholder="Ex. Le Seigneur des anneaux"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "movie" | "book" | "tv")}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-50 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
          >
            <option value="movie">Film</option>
            <option value="book">Livre</option>
            <option value="tv">TV (M3U)</option>
          </select>
        </div>

        <div className="space-y-3">
          <span className="block text-sm font-medium text-slate-200">
            Fichier ou lien
          </span>
          <div className="flex gap-4 rounded-lg bg-slate-800/60 p-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="source"
                checked={sourceType === "file"}
                onChange={() => setSourceType("file")}
                className="text-sky-500"
              />
              <span className="text-sm text-slate-200">Uploader un fichier</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="source"
                checked={sourceType === "url"}
                onChange={() => setSourceType("url")}
                className="text-sky-500"
              />
              <span className="text-sm text-slate-200">Lien externe</span>
            </label>
          </div>

          {sourceType === "file" ? (
            <div>
              <input
                type="file"
                accept=".pdf,.epub,.mp4,.webm,.mkv,.avi,.mov,.m3u,.m3u8,video/*,application/pdf,text/plain"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f) {
                    const name = f.name.toLowerCase();
                    if (name.endsWith(".m3u") || name.endsWith(".m3u8")) {
                      setType("tv");
                    }
                  }
                }}
                className="w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:text-slate-950"
              />
              <p className="mt-1 text-xs text-slate-500">
                PDF, EPUB, MP4, M3U — stocké sur Supabase (max 500 Mo par fichier).
              </p>
            </div>
          ) : (
            <div>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setExternalUrl(val);
                  const lower = val.trim().toLowerCase();
                  if (lower.endsWith(".m3u") || lower.endsWith(".m3u8")) {
                    setType("tv");
                  }
                }}
                placeholder="https://mega.nz/... ou https://..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-50 placeholder-slate-500 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
              />
              <p className="mt-1 text-xs text-slate-500">
                Mega, Google Drive, ou tout lien direct vers le fichier.
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerateMetadata}
              disabled={loadingMetadata || !title.trim() || type === "tv"}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-slate-600 disabled:opacity-60"
            >
              {loadingMetadata
                ? "Génération IA en cours…"
                : type === "tv"
                ? "IA indisponible pour TV"
                : "Pré-remplir avec l’IA"}
            </button>
            <button
              type="submit"
              disabled={formState === "loading"}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {formState === "loading" ? "Publication…" : "Publier"}
            </button>
          </div>
          {metadata && (
            <p className="text-xs text-slate-500">
              La fiche ci-dessous est pré-remplie par l’IA. Tu peux modifier
              chaque champ avant de publier.
            </p>
          )}
        </div>

        {metadata && (
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Titre complet
                </label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) =>
                    setMetadata((m) =>
                      m ? { ...m, title: e.target.value } : m
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Année de sortie
                </label>
                <input
                  type="number"
                  value={metadata.year}
                  onChange={(e) =>
                    setMetadata((m) =>
                      m ? { ...m, year: e.target.value } : m
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
                  placeholder="2001"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Genre
                </label>
                <input
                  type="text"
                  value={metadata.genre}
                  onChange={(e) =>
                    setMetadata((m) =>
                      m ? { ...m, genre: e.target.value } : m
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
                  placeholder="Science-fiction, Fantasy…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Âge conseillé
                </label>
                <input
                  type="text"
                  value={metadata.age_rating}
                  onChange={(e) =>
                    setMetadata((m) =>
                      m ? { ...m, age_rating: e.target.value } : m
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
                  placeholder="Tous publics, 12+, 16+…"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Description
              </label>
              <textarea
                value={metadata.description}
                onChange={(e) =>
                  setMetadata((m) =>
                    m ? { ...m, description: e.target.value } : m
                  )
                }
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                URL de l’image de couverture
              </label>
              <input
                type="url"
                value={metadata.cover_url}
                onChange={(e) =>
                  setMetadata((m) =>
                    m ? { ...m, cover_url: e.target.value } : m
                  )
                }
                placeholder="https://…"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
              />
              {coverSuggestions.length > 0 && (
                <div className="mt-2">
                  <p className="mb-2 text-xs text-slate-400">Suggestions fiables:</p>
                  <div className="flex flex-wrap gap-2">
                        {coverSuggestions.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() =>
                          setMetadata((m) => (m ? { ...m, cover_url: url } : m))
                        }
                        className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs text-slate-200 hover:border-slate-600"
                        title={url}
                      >
                        <span className="inline-block h-6 w-4 overflow-hidden rounded-sm">
                          <span className="sr-only">aperçu</span>
                        </span>
                            {(() => { try { return new URL(url).hostname; } catch { return "image"; } })()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {metadata.cover_url && (
                <div className="mt-2">
                  <div className="relative h-48 w-full overflow-hidden rounded-md border border-slate-800">
                    <Image
                      src={metadata.cover_url}
                      alt="Aperçu de la couverture"
                      fill
                      sizes="192px"
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {message && (
          <p
            className={`text-sm ${
              formState === "error" ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {message}
          </p>
        )}
      </form>

      <p>
        <Link
          href="/dashboard"
          className="text-sky-400 hover:underline"
        >
          ← Retour au catalogue
        </Link>
      </p>
    </div>
  );
}
