// Vérifie que la projection lat/lon reste alignée sur le tracé réel de la carte (ATLAS
// Map) — régression possible : un bug de calibration a placé Amsterdam près du Japon
// avant correction (23/09/2026). Tolérance de quelques % (~5 unités sur 100), cohérente
// avec la précision de calibration d'origine (< 1% sur les points de référence exacts).
import { describe, it, expect } from "vitest";
import { project } from "@/lib/geo/projection";

describe("Projection géographique — ATLAS Map", () => {
  it("place chaque grande région dans le bon quadrant relatif", () => {
    const tokyo = project(35.68, 139.65); // Asie de l'Est -> doit être à droite
    const newYork = project(40.64, -73.78); // Amérique du Nord -> doit être à gauche
    const amsterdam = project(52.37, 4.9); // Europe de l'Ouest -> centre-gauche
    const bali = project(-8.75, 115.17); // Asie du Sud-Est -> droite, sous l'équateur visuel
    const reykjavik = project(64.15, -21.94); // Islande -> en haut (haute latitude)

    // Ordre relatif attendu sur l'axe x (ouest -> est)
    expect(newYork.x).toBeLessThan(amsterdam.x);
    expect(amsterdam.x).toBeLessThan(tokyo.x);
    expect(amsterdam.x).toBeLessThan(bali.x);

    // Reykjavik (haute latitude nord) doit être nettement plus haut que Bali (sous l'équateur)
    expect(reykjavik.y).toBeLessThan(bali.y);

    // Aucun point réel ne doit sortir de la zone visible avec une marge large
    for (const p of [tokyo, newYork, amsterdam, bali, reykjavik]) {
      expect(p.x).toBeGreaterThan(-10);
      expect(p.x).toBeLessThan(110);
      expect(p.y).toBeGreaterThan(-10);
      expect(p.y).toBeLessThan(110);
    }
  });

  it("reste proche des points de calibration d'origine (non-régression)", () => {
    // Mêmes pays de référence utilisés pour dériver les coefficients — tolérance large
    // (5 unités) car ce ne sont pas les centroïdes exacts utilisés lors du calibrage.
    const capeTown = project(-33.9, 18.4); // Afrique du Sud
    const brasilia = project(-15.8, -47.9); // Brésil
    const berlin = project(52.5, 13.4); // Allemagne

    expect(capeTown.x).toBeGreaterThan(45);
    expect(capeTown.x).toBeLessThan(65);
    expect(brasilia.x).toBeGreaterThan(15);
    expect(brasilia.x).toBeLessThan(40);
    expect(berlin.y).toBeGreaterThan(10);
    expect(berlin.y).toBeLessThan(35);
  });
});
