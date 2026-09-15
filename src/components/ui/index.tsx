import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-atlas-border bg-atlas-panel/70 backdrop-blur-sm shadow-panel ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-atlas-border px-5 py-4">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-wide text-atlas-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-atlas-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger" | "gold" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-atlas-line/40 text-atlas-muted border-atlas-border",
    good: "bg-atlas-good/10 text-atlas-good border-atlas-good/30",
    warn: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    danger: "bg-atlas-danger/10 text-atlas-danger border-atlas-danger/30",
    gold: "bg-atlas-gold/10 text-atlas-gold border-atlas-gold/30",
    accent: "bg-atlas-accent/10 text-atlas-accent border-atlas-accent/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function scoreTone(score: number): "gold" | "good" | "accent" | "warn" | "danger" {
  if (score >= 97) return "gold";
  if (score >= 85) return "good";
  if (score >= 75) return "accent";
  if (score >= 60) return "warn";
  return "danger";
}

export function ScoreRing({ score, size = 64, label = "ATLAS" }: { score: number; size?: number; label?: string }) {
  const tone = scoreTone(score);
  const colors: Record<string, string> = {
    gold: "#f2c14e",
    good: "#4ade80",
    accent: "#3fd6c9",
    warn: "#f59e0b",
    danger: "#ff6b6b",
  };
  return (
    <div
      className="score-ring relative flex items-center justify-center rounded-full"
      style={{ width: size, height: size, "--pct": score, "--ring-color": colors[tone] } as React.CSSProperties}
    >
      <div className="flex flex-col items-center justify-center rounded-full bg-atlas-panel" style={{ width: size - 10, height: size - 10 }}>
        <span className="font-display text-lg font-bold leading-none text-atlas-text">{score}</span>
        <span className="mt-0.5 text-[9px] uppercase tracking-wider text-atlas-muted">{label}</span>
      </div>
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-atlas-muted">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold text-atlas-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-atlas-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-atlas-border px-6 py-14 text-center">
      <p className="font-display text-sm font-medium text-atlas-text">{title}</p>
      {description && <p className="max-w-sm text-xs text-atlas-muted">{description}</p>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants: Record<string, string> = {
    primary: "bg-atlas-accent text-atlas-bg hover:brightness-110 shadow-glow",
    ghost: "bg-transparent border border-atlas-border text-atlas-text hover:border-atlas-accent/50",
    danger: "bg-atlas-danger/15 border border-atlas-danger/40 text-atlas-danger hover:bg-atlas-danger/25",
  };
  return (
    <button
      type={type}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
