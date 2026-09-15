import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATLAS — Flight Intelligence",
  description: "Agent personnel autonome de détection d'opportunités de voyage",
};

// Coquille minimale : la Nav et le contenu applicatif vivent dans (dashboard)/layout.tsx,
// pour que /login reste un écran plein-page sans exposer le menu avant authentification.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-atlas-canvas min-h-screen">{children}</body>
    </html>
  );
}
