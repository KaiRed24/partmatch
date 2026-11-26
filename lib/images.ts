import type { ImageInput } from "./ai";

export const MAX_PHOTOS = 3;
export const MAX_BYTES = 8 * 1024 * 1024;

/** Work out the real image type from the file's first bytes, not its name or the browser's claim. */
export function sniffImage(buf: Buffer): ImageInput["mediaType"] | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Very small in-memory limiter: fine for a single-instance prototype. */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}
