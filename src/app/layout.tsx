import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TomSLib - Catalogue privé",
  description: "Catalogue privé de films et de livres"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}

