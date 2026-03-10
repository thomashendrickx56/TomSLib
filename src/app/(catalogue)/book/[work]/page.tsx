"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type WorkDetails = {
  title: string;
  description: string | null;
  covers: number[];
  authors: Array<{ key: string }>;
  first_publish_date?: string;
};

export default function BookDetailPage() {
  const params = useParams();
  const work = decodeURIComponent(params.work as string); // e.g., /works/OL12345W
  const [details, setDetails] = useState<WorkDetails | null>(null);
  const [authorNames, setAuthorNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`https://openlibrary.org${work}.json`, { cache: "no-store" });
        if (!res.ok) {
          setDetails(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        const desc =
          typeof data.description === "string"
            ? data.description
            : data.description?.value || null;
        const d: WorkDetails = {
          title: String(data.title || ""),
          description: desc,
          covers: Array.isArray(data.covers) ? data.covers : [],
          authors: Array.isArray(data.authors) ? data.authors : [],
          first_publish_date: data.first_publish_date || undefined,
        };
        setDetails(d);
        const names: string[] = [];
        for (const a of d.authors) {
          try {
            const ar = await fetch(`https://openlibrary.org${a.key}.json`, { cache: "no-store" });
            const aj = await ar.json();
            if (aj?.name) names.push(String(aj.name));
          } catch {
            // ignore
          }
        }
        setAuthorNames(names);
      } catch {
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [work]);

  const coverId = details?.covers?.[0];
  const coverUrl =
    typeof coverId === "number"
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null;

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-block text-sm text-sky-400 hover:underline">
        ← Retour au catalogue
      </Link>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
          Chargement…
        </div>
      ) : !details ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-slate-400">Livre introuvable.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            {coverUrl && (
              <div className="relative w-full md:w-40">
                <div className="relative h-56 w-full overflow-hidden rounded-md">
                  <Image
                    src={coverUrl}
                    alt={details.title}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-slate-50">{details.title}</h1>
              {authorNames.length > 0 && (
                <p className="mt-1 text-sm text-slate-400">{authorNames.join(", ")}</p>
              )}
              {details.first_publish_date && (
                <p className="mt-1 text-sm text-slate-400">{details.first_publish_date}</p>
              )}
              {details.description && (
                <p className="mt-3 whitespace-pre-line text-slate-300">{details.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
