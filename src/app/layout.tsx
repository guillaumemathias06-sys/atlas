import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATLAS — Flight Intelligence",
  description: "Agent personnel autonome de détection d'opportunités de voyage",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-atlas-canvas min-h-screen">
        <div className="flex">
          <Nav />
          <main className="min-h-screen flex-1 overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
