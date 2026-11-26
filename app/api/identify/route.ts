import { NextResponse } from "next/server";
import type { ImageInput } from "@/lib/ai";
import { identify } from "@/lib/identify";
import { MAX_BYTES, MAX_PHOTOS, rateLimited, sniffImage } from "@/lib/images";
import { FITTING_TYPES, type FittingType } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST multipart/form-data: fitting_type, photos (1-3 JPEG/PNG/WebP files). */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`identify:${ip}`)) {
    return NextResponse.json({ error: "Too many tries in a minute. Please wait a moment and try again." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Please send the photos as a form upload." }, { status: 400 });
  }

  const ft = String(form.get("fitting_type") ?? "");
  const fittingType = (FITTING_TYPES as readonly string[]).includes(ft) ? (ft as FittingType) : null;

  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "Please add at least one photo." }, { status: 400 });
  if (files.length > MAX_PHOTOS) return NextResponse.json({ error: `Please add up to ${MAX_PHOTOS} photos.` }, { status: 400 });

  const images: ImageInput[] = [];
  for (const f of files) {
    if (f.size > MAX_BYTES) return NextResponse.json({ error: "One photo is too large. Please use photos under 8MB." }, { status: 413 });
    const buf = Buffer.from(await f.arrayBuffer());
    const mediaType = sniffImage(buf);
    if (!mediaType) return NextResponse.json({ error: "Please upload JPEG, PNG or WebP photos." }, { status: 415 });
    images.push({ mediaType, base64: buf.toString("base64") });
  }

  try {
    const result = await identify({ db: supabaseAdmin(), images, fittingType });
    const { extraction, ...publicResult } = result;
    return NextResponse.json({ ...publicResult, category: extraction.category });
  } catch (err) {
    console.error("identify failed", err);
    return NextResponse.json(
      { error: "We couldn't read that photo just now. Please try again, or ask our team to identify it for you." },
      { status: 502 },
    );
  }
}
