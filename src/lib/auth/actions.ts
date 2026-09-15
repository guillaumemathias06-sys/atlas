"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, expectedAuthToken, sha256Hex } from "./siteAuth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const expected = await expectedAuthToken();

  if (!expected) {
    redirect(next); // aucune protection configurée : rien à vérifier
  }

  const submitted = await sha256Hex(password);
  if (submitted !== expected) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  cookies().set(AUTH_COOKIE_NAME, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
