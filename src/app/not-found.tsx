// Filet de sécurité pour une URL totalement hors de l'arbre de routes (le 404 "normal",
// dans le contexte applicatif avec la Nav, vit dans (dashboard)/not-found.tsx).
import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-atlas-border bg-atlas-panel/70 p-8 text-center shadow-panel">
        <p className="text-3xl">🧭</p>
        <h1 className="mt-3 font-display text-lg font-semibold text-atlas-text">Page introuvable</h1>
        <p className="mt-2 text-sm text-atlas-muted">Cette page n'existe pas, ou plus.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-atlas-accent px-4 py-2 text-sm font-medium text-atlas-bg shadow-glow transition hover:brightness-110"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
