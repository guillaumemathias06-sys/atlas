// État "loading" global (section 24) — couvre toutes les routes qui n'ont pas leur
// propre loading.tsx, via le mécanisme de Suspense automatique de l'App Router.
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <div className="mb-8 h-8 w-56 animate-pulse rounded-lg bg-atlas-line/30" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl border border-atlas-border bg-atlas-panel/50" />
        ))}
      </div>
    </div>
  );
}
