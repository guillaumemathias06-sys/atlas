// Protection d'accès au site — mot de passe unique (outil personnel mono-utilisateur,
// pas de gestion multi-comptes : ce serait du sur-engineering pour ce produit).
// Utilise Web Crypto (disponible en Edge runtime pour middleware.ts ET en Node 20+) pour
// ne jamais stocker le mot de passe en clair dans le cookie.
export const AUTH_COOKIE_NAME = "atlas_auth";

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** null = aucun mot de passe configuré (SITE_PASSWORD absent) => accès libre, cas du dev local. */
export async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return sha256Hex(password);
}

export function isSiteAuthEnabled(): boolean {
  return Boolean(process.env.SITE_PASSWORD);
}
