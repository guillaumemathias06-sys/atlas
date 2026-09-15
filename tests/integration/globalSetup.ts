// Global setup pour les tests d'intégration : base SQLite isolée (jamais dev.db), créée
// avant la suite et supprimée après. `process.env.DATABASE_URL` doit être positionné ICI
// (avant que vitest.config.ts.test.env ne le fasse pour les process de test) ET dans
// test.env pour que les workers de test héritent de la même valeur.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const DB_PATH = path.join(ROOT, "prisma", "test.db");
const DATABASE_URL = `file:${DB_PATH}`;

export async function setup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const p = DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL },
    stdio: "pipe",
  });
}

export async function teardown() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const p = DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
