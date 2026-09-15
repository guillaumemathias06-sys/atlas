// Porte d'accès au site (voir src/lib/auth/siteAuth.ts). Ne s'active que si SITE_PASSWORD
// est défini — en dev local (non défini), l'accès reste libre pour rester simple à tester.
// /login et /api/engine/scan (protégé séparément par CRON_SECRET, appelé par un cron sans
// cookie navigateur) et /api/health (lecture seule, sans donnée sensible) sont exclus.
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, expectedAuthToken } from "@/lib/auth/siteAuth";

export async function middleware(request: NextRequest) {
  const expected = await expectedAuthToken();
  if (!expected) return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie === expected) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|api/engine/scan|api/health|_next/static|_next/image|favicon.ico).*)"],
};
