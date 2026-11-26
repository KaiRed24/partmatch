import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Minimal staff auth for the prototype: one shared ADMIN_PASSWORD. The browser gets an httpOnly cookie
 * holding an HMAC of the password (never the password itself). Scripts/tests can send x-admin-password.
 */
export const ADMIN_COOKIE = "pm_admin";

const digest = (pw: string) => createHmac("sha256", "partmatch-admin").update(pw).digest("base64url");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function adminCookieValue(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? digest(pw) : null;
}

export function passwordMatches(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return Boolean(pw) && same(digest(input), digest(pw!));
}

/** True for a logged-in staff browser, or a request carrying the right x-admin-password header. */
export function isAdmin(req?: Request): boolean {
  const expected = adminCookieValue();
  if (!expected) return false;
  const header = req?.headers.get("x-admin-password");
  if (header && passwordMatches(header)) return true;
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  return Boolean(cookie) && same(cookie!, expected);
}
