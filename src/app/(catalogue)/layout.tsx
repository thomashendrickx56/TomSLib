"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CatalogueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then(async (data) => {
        setIsAdmin(!!data.isAdmin);
        setIsAllowed(!!data.isAllowed);
        if (!data.isAllowed) {
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            // ignore aborted errors
          }
          router.replace("/");
        }
      })
      .catch(() => {
        setIsAdmin(false);
        setIsAllowed(false);
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore aborted errors
    }
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-slate-50"
          >
            TomSLib
          </Link>
          <nav className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Déconnexion
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {isAllowed === false ? null : children}
      </main>
    </div>
  );
}
