import { Card, Button } from "@/components/ui";
import { login } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams.next ?? "/";

  return (
    <div className="bg-atlas-canvas flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-atlas-accent/15 text-atlas-accent">✦</div>
          <div>
            <p className="font-display text-sm font-bold tracking-wider text-atlas-text">ATLAS</p>
            <p className="text-[10px] uppercase tracking-widest text-atlas-muted">accès privé</p>
          </div>
        </div>

        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="text-xs font-medium text-atlas-muted">Mot de passe</span>
            <input
              type="password"
              name="password"
              autoFocus
              required
              className="mt-1 w-full rounded-lg border border-atlas-border bg-atlas-panel2 px-3 py-2 text-sm text-atlas-text outline-none focus:border-atlas-accent/60"
            />
          </label>
          {searchParams.error && <p className="text-xs text-atlas-danger">Mot de passe incorrect.</p>}
          <Button type="submit" className="w-full">Entrer</Button>
        </form>
      </Card>
    </div>
  );
}
