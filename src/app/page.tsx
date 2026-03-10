"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isEmailAllowed } from "@/config/allowedEmails";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const COOLDOWN_STORAGE_KEY = "authCooldown";

  const loadCooldownForEmail = (em: string) => {
    try {
      const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (!raw) return 0;
      const map = JSON.parse(raw) as Record<string, number>;
      const exp = map[em.trim().toLowerCase()];
      if (!exp) return 0;
      const now = Date.now();
      return exp > now ? Math.ceil((exp - now) / 1000) : 0;
    } catch {
      return 0;
    }
  };

  const saveCooldownForEmail = (em: string, seconds: number) => {
    try {
      const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      map[em.trim().toLowerCase()] = Date.now() + seconds * 1000;
      localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  useEffect(() => {
    if (email) {
      setCooldown(loadCooldownForEmail(email));
    }
  }, [email]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (cooldown > 0) {
        throw new Error(`Trop de tentatives. Réessaie dans ${cooldown}s.`);
      }
      if (!isEmailAllowed(email)) {
        throw new Error("Email non autorisé. Contacte l’administrateur.");
      }
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password
        });
        if (signUpError) throw signUpError;
        setMessage(
          "Compte créé. Vérifie tes emails si la confirmation est requise, puis connecte-toi."
        );
        setMode("login");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        window.location.href = "/dashboard";
        return;
      }
    } catch (err: any) {
      const msg = String(err?.message ?? "").toLowerCase();
      if (msg.includes("rate limit") || msg.includes("too many requests")) {
        const next =
          cooldown > 0 ? Math.min(cooldown + 60, 300) : 60;
        setCooldown(next);
        saveCooldownForEmail(email, next);
        setError(`Trop de tentatives. Réessaie dans ${next} s.`);
      } else {
        setError(err.message ?? "Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">
          TomSLib — Accès privé
        </h1>

        <div className="mb-6 flex rounded-lg bg-slate-800/60 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md px-3 py-2 transition ${
              mode === "login"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md px-3 py-2 transition ${
              mode === "signup"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
              placeholder="toi@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50"
              placeholder="Au moins 6 caractères"
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Patiente..."
              : mode === "login"
              ? "Se connecter"
              : "Créer un compte"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        {message && !error && (
          <p className="mt-4 text-sm text-emerald-400">
            {message}
          </p>
        )}
        {cooldown > 0 && (
          <p className="mt-2 text-center text-xs text-slate-400">
            Réessaie dans {cooldown} s.
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Tout le catalogue TomSLib sera accessible uniquement après connexion.
        </p>
      </div>
    </main>
  );
}
