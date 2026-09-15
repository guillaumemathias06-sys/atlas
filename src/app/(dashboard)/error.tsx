"use client";
// État "erreur" global (section 24) — capture toute erreur de rendu non gérée dans un
// segment de route, avec le style ATLAS plutôt que l'écran d'erreur générique de Next.js.
import { useEffect } from "react";
import { Card, Button } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ATLAS — erreur de rendu:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-8 text-center">
      <Card className="w-full p-8">
        <p className="text-3xl">⚠</p>
        <h1 className="mt-3 font-display text-lg font-semibold text-atlas-text">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-atlas-muted">
          ATLAS a rencontré un problème en affichant cette page. Vous pouvez réessayer, ou revenir au dashboard.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-atlas-panel2 p-3 text-left text-[11px] text-atlas-danger">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="ghost" onClick={() => (window.location.href = "/")}>
            Retour au dashboard
          </Button>
          <Button onClick={() => reset()}>Réessayer</Button>
        </div>
      </Card>
    </div>
  );
}
