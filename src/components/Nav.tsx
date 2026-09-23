"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth/actions";

// Deux groupes : "Découvrir" (usage quotidien) et "Réglages" (configuration/technique) —
// pour qu'on sache tout de suite quoi regarder chaque jour vs ce qu'on touche rarement.
// Chaque entrée a un sous-titre d'une ligne : jamais un nom de page sans dire à quoi elle sert.
const DISCOVER = [
  { href: "/", label: "Dashboard", hint: "Vue d'ensemble et meilleures opportunités", icon: "◈" },
  { href: "/map", label: "ATLAS Map", hint: "Les deals sur une carte du monde", icon: "✈" },
  { href: "/deals", label: "Deals", hint: "Toutes les opportunités détectées", icon: "◆" },
  { href: "/destinations", label: "Destinations", hint: "Climat, événements, prix par ville", icon: "▤" },
  { href: "/alerts", label: "Alerts", hint: "Les meilleures offres, notifiées", icon: "◉" },
];

const SETTINGS_ITEMS = [
  { href: "/prices", label: "Price History", hint: "Historique complet des prix observés", icon: "▲" },
  { href: "/profiles", label: "Travel Profiles", hint: "Famille, couple, chasseur de bons plans", icon: "▣" },
  { href: "/calendar", label: "Calendar", hint: "Tes dates indisponibles", icon: "▦" },
  { href: "/automation", label: "Automation", hint: "Règles d'achat auto — désactivé par défaut", icon: "⚙" },
  { href: "/settings", label: "Settings", hint: "Aéroports, préférences, seuils", icon: "≡" },
  { href: "/health", label: "System Health", hint: "Moteur, coût des recherches, journaux", icon: "♥" },
];

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: typeof DISCOVER;
  pathname: string;
}) {
  return (
    <div>
      <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-widest text-atlas-muted/70">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-atlas-accent/10 text-atlas-accent border border-atlas-accent/20"
                  : "text-atlas-muted hover:bg-atlas-line/20 hover:text-atlas-text border border-transparent"
              }`}
            >
              <span className="w-4 shrink-0 text-center leading-5">{item.icon}</span>
              <span className="min-w-0">
                <span className="block leading-5">{item.label}</span>
                <span className={`block truncate text-[11px] leading-4 ${active ? "text-atlas-accent/70" : "text-atlas-muted/60"}`}>
                  {item.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Nav({ authEnabled }: { authEnabled: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-atlas-border bg-atlas-panel/60">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-accent/15 text-atlas-accent">
          ✦
        </div>
        <div>
          <p className="font-display text-sm font-bold tracking-wider text-atlas-text">ATLAS</p>
          <p className="text-[10px] uppercase tracking-widest text-atlas-muted">flight intelligence</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-2">
        <NavGroup title="Découvrir" items={DISCOVER} pathname={pathname} />
        <NavGroup title="Réglages" items={SETTINGS_ITEMS} pathname={pathname} />
      </nav>
      <div className="border-t border-atlas-border px-5 py-4">
        <p className="text-[10px] text-atlas-muted">ATLAS v0.1 {authEnabled ? "" : "· mode local"}</p>
        {authEnabled && (
          <form action={logout} className="mt-2">
            <button type="submit" className="text-[11px] text-atlas-muted hover:text-atlas-accent">
              Se déconnecter
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
