import Link from "next/link";
import { Card } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-8 text-center">
      <Card className="w-full p-8">
        <p className="text-3xl">🧭</p>
        <h1 className="mt-3 font-display text-lg font-semibold text-atlas-text">Destination introuvable</h1>
        <p className="mt-2 text-sm text-atlas-muted">Cette page n'existe pas, ou plus.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-atlas-accent px-4 py-2 text-sm font-medium text-atlas-bg shadow-glow transition hover:brightness-110"
        >
          Retour au dashboard
        </Link>
      </Card>
    </div>
  );
}
