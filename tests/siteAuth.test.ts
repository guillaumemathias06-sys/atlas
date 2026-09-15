import { describe, it, expect, afterEach } from "vitest";
import { sha256Hex, expectedAuthToken, isSiteAuthEnabled } from "@/lib/auth/siteAuth";

describe("Protection d'accès au site (mise en ligne)", () => {
  afterEach(() => {
    delete process.env.SITE_PASSWORD;
  });

  it("sha256Hex est déterministe et sensible à la casse/contenu", async () => {
    const a = await sha256Hex("secret");
    const b = await sha256Hex("secret");
    const c = await sha256Hex("Secret");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(64); // hex SHA-256
  });

  it("aucune protection tant que SITE_PASSWORD n'est pas défini (dev local)", async () => {
    expect(isSiteAuthEnabled()).toBe(false);
    expect(await expectedAuthToken()).toBeNull();
  });

  it("s'active dès que SITE_PASSWORD est défini", async () => {
    process.env.SITE_PASSWORD = "mon-mot-de-passe";
    expect(isSiteAuthEnabled()).toBe(true);
    const token = await expectedAuthToken();
    expect(token).toBe(await sha256Hex("mon-mot-de-passe"));
  });
});
