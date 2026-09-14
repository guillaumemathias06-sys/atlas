// Fonctions statistiques utilisées par le Fare Intelligence engine (section 6-7)

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

/** Percentile (0-100) de `value` par rapport à l'échantillon `values` */
export function percentileOf(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const below = values.filter((v) => v <= value).length;
  return Math.round((below / values.length) * 100);
}

export function min(values: number[]): number {
  return values.length ? Math.min(...values) : 0;
}

export function max(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
