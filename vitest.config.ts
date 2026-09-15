import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Base SQLite isolée pour les tests d'intégration (tests/integration/globalSetup.ts) —
    // jamais dev.db. Les tests purement unitaires n'y touchent pas.
    env: {
      DATABASE_URL: `file:${path.resolve(__dirname, "prisma/test.db")}`,
    },
    globalSetup: ["./tests/integration/globalSetup.ts"],
    // SQLite ne supporte pas bien l'écriture concurrente : on garde les fichiers de test
    // séquentiels plutôt que d'introduire une base par worker (suite volontairement petite).
    fileParallelism: false,
  },
});
