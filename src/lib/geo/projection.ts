// Projection lat/lon -> coordonnées (0-100, 0-100) pour ATLAS Map.
// Calibrée empiriquement contre le tracé réel de worldMapPaths.ts (ce n'est PAS un
// planisphère complet -180..180/-90..90 : le tracé source est rogné). Coefficients
// dérivés par régression linéaire sur 6 pays de référence bien répartis (Afrique du Sud,
// Brésil, Inde, Allemagne, Mexique, Égypte) — écart < 1% partout. Voir
// docs/changelog.md (23/09/2026) pour la méthode complète.
export function project(lat: number, lon: number): { x: number; y: number } {
  const x = 0.305861 * lon + 48.039149;
  const y = -0.595162 * lat + 63.267004;
  return { x, y };
}
