import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed links for the Wait / Part-ship / Refund email buttons.
 * Token = <orderId>.<expiry>.<nonce>.<signature>. The same token is stored on the order, so marking the
 * order delayed again (new token) makes older email links stop working.
 */
const TTL_DAYS = 14;

function secret(): string {
  const s = process.env.CHOICE_TOKEN_SECRET;
  if (!s || s.length < 16) throw new Error("CHOICE_TOKEN_SECRET is missing or too short in .env");
  return s;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function createChoiceToken(orderId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_DAYS * 86400;
  const body = `${orderId}.${exp}.${randomBytes(6).toString("base64url")}`;
  return `${body}.${sign(body)}`;
}

/** Returns the order id if the signature is valid and the link hasn't expired. */
export function verifyChoiceToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [orderId, exp, nonce, sig] = parts;
  const expected = Buffer.from(sign(`${orderId}.${exp}.${nonce}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return orderId;
}
