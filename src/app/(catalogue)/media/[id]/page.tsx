"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Media } from "@/types/media";
import Image from "next/image";

function getDriveEmbedUrl(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/file/d/${match[1]}/preview`;
}

/** URL qui peut être affichée dans un iframe (lecture directe). */
function isEmbeddableUrl(url: string): boolean {
  if (getDriveEmbedUrl(url)) return true;
  if (url.includes("supabase.co/storage")) return true;
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".mkv")
  );
}

function getEmbedUrl(url: string): string {
  const driveEmbed = getDriveEmbedUrl(url);
  if (driveEmbed) return driveEmbed;
  return url;
}

export default function MediaDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Array<{ name: string; url: string }>>([]);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      const { data, error } = await supabase
        .from("media")
        .select("id, type, title, description, drive_url, year, age_rating, genre, cover_url")
        .eq("id", id)
        .single();

      if (error || !data) {
        setMedia(null);
      } else {
        setMedia(data as Media);
      }
      setLoading(false);
    };
    if (id) fetchMedia();
  }, [id]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!media || media.type !== "tv") return;
      setChannelsError(null);
      setChannels([]);
      try {
        const res = await fetch(media.drive_url, { cache: "no-store" });
        if (!res.ok) {
          setChannelsError("Impossible de charger le fichier M3U.");
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
            // next non-empty, non-comment line is the URL
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
        setChannelsError("Erreur de lecture du fichier M3U.");
      }
    };
    fetchChannels();
  }, [media]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        Chargement…
      </div>
    );
  }

  if (!media) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-400">Contenu introuvable.</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sky-400 hover:underline"
        >
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const embeddable = isEmbeddableUrl(media.drive_url);
  const embedUrl = getEmbedUrl(media.drive_url);
  const driveEmbed = getDriveEmbedUrl(media.drive_url);
  const isVideo =
    media.drive_url.toLowerCase().endsWith(".mp4") ||
    media.drive_url.toLowerCase().endsWith(".webm") ||
    media.drive_url.toLowerCase().endsWith(".ogg") ||
    media.drive_url.toLowerCase().endsWith(".mkv");

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-block text-sm text-sky-400 hover:underline"
      >
        ← Retour au catalogue
      </Link>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row">
          {media.cover_url && (
            <div className="relative w-full md:w-40">
              <div className="relative h-56 w-full overflow-hidden rounded-md">
                <Image
                  src={media.cover_url}
                  alt={media.title}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
            </div>
          )}
          <div className="flex-1">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-sky-400">
              {media.type === "movie" ? "Film" : media.type === "book" ? "Livre" : "TV"}
              {media.year && (
                <span className="ml-2 text-[11px] font-normal text-slate-400">
                  • {media.year}
                </span>
              )}
              {media.age_rating && (
                <span className="ml-2 rounded-full border border-slate-700 px-2 py-px text-[10px] font-medium text-slate-200">
                  {media.age_rating}
                </span>
              )}
            </span>
            <h1 className="text-2xl font-semibold text-slate-50">
              {media.title}
            </h1>
            {media.genre && (
              <p className="mt-1 text-sm text-slate-400">{media.genre}</p>
            )}
            {media.description && (
              <p className="mt-3 text-slate-300">{media.description}</p>
            )}
          </div>
        </div>
      </div>

      {media.type !== "tv" ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-300">
            Lecture en ligne
          </h2>
          {embeddable && (
            <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg bg-black">
              {isVideo && !driveEmbed ? (
                <VideoPlayer src={embedUrl} title={media.title} />
              ) : (
                <iframe
                  title={media.title}
                  src={embedUrl}
                  className="h-full w-full min-h-[400px]"
                  allow="autoplay"
                  allowFullScreen
                />
              )}
            </div>
          )}
          {!embeddable && (
            <p className="mb-3 text-xs text-slate-500">
              Ce fichier ne peut pas être intégré directement. Il sera ouvert dans un nouvel onglet.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
            >
              Lire en ligne
            </a>
            <a
              href={media.drive_url}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500 px-4 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/10"
            >
              Télécharger
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-300">Chaînes TV</h2>
          {channelsError && (
            <p className="mb-3 text-xs text-red-400">{channelsError}</p>
          )}
          {!channelsError && channels.length === 0 && (
            <p className="mb-3 text-xs text-slate-500">
              Aucune chaîne détectée dans cette playlist.
            </p>
          )}
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((ch) => (
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
          <div className="mt-4 flex gap-3">
            <a
              href={media.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400"
            >
              Ouvrir la playlist
            </a>
            <a
              href={media.drive_url}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500 px-4 py-2 text-sm font-medium text-sky-400 hover:bg-sky-500/10"
            >
              Télécharger M3U
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ src, title }: { src: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime || 0);
  };

  const onSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.currentTime = val;
    setCurrent(val);
  };

  const onVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    setVolume(val);
  };

  const toFullScreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen?.();
    }
  };

  const format = (t: number) => {
    const s = Math.floor(t % 60);
    const m = Math.floor((t / 60) % 60);
    const h = Math.floor(t / 3600);
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const show = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2000);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  return (
    <div
      className="relative h-full w-full"
      onMouseMove={show}
      onMouseEnter={show}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full"
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTimeUpdate}
        preload="metadata"
      />
      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        <div className="mb-2 flex items-center gap-3 text-slate-50">
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-md bg-slate-800/60 px-3 py-2 text-sm"
          >
            {playing ? "Pause" : "Lecture"}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={current}
              onChange={onSeek}
              className="w-[40vw]"
            />
            <span className="text-xs">{format(current)} / {format(duration)}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={onVolume}
              className="w-24"
            />
            <button
              type="button"
              onClick={toFullScreen}
              className="rounded-md bg-slate-800/60 px-3 py-2 text-sm"
            >
              Plein écran
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-300 line-clamp-1">{title}</div>
      </div>
    </div>
  );
}
