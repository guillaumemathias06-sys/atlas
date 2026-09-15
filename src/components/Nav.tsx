"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth/actions";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: "◈" },
  { href: "/map", label: "ATLAS Map", icon: "✈" },
  { href: "/deals", label: "Deals", icon: "◆" },
  { href: "/destinations", label: "Destination Explorer", icon: "▤" },
  { href: "/prices", label: "Price History", icon: "▲" },
  { href: "/alerts", label: "Alerts", icon: "◉" },
  { href: "/engine", label: "Search Engine Status", icon: "⟳" },
  { href: "/profiles", label: "Travel Profiles", icon: "▣" },
  { href: "/calendar", label: "Calendar", icon: "▦" },
  { href: "/automation", label: "Automation", icon: "⚙" },
  { href: "/settings", label: "Settings", icon: "≡" },
  { href: "/health", label: "System Health", icon: "♥" },
];

export function Nav({ authEnabled }: { authEnabled: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-atlas-border bg-atlas-panel/60">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-atlas-accent/15 text-atlas-accent">
          ✦
        </div>
        <div>
          <p className="font-display text-sm font-bold tracking-wider text-atlas-text">ATLAS</p>
          <p className="text-[10px] uppercase tracking-widest text-atlas-muted">flight intelligence</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-atlas-accent/10 text-atlas-accent border border-atlas-accent/20"
                  : "text-atlas-muted hover:bg-atlas-line/20 hover:text-atlas-text border border-transparent"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
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
