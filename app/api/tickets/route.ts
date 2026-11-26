import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_BYTES, MAX_PHOTOS, rateLimited, sniffImage } from "@/lib/images";
import { FITTING_TYPES } from "@/lib/schemas";
import { PHOTO_BUCKET, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Creates a "Part identification" ticket for the team (plan section 3, item 3).
 * multipart/form-data: name, email, notes?, identification_id? (links photos, answers and AI candidates),
 * or, when there is no identification yet (e.g. shower enclosures), fitting_type + photos.
 */
const Fields = z.object({
  name: z.string().trim().min(1, "Please add your name.").max(100),
  email: z.string().trim().email("Please check your email address.").max(200),
  notes: z.string().trim().max(2000).optional().default(""),
  identification_id: z.string().uuid().optional(),
  fitting_type: z.enum(FITTING_TYPES).optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`ticket:${ip}`, 5)) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form." }, { status: 400 });

  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const parsed = Fields.safeParse({
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    notes: str("notes"),
    identification_id: str("identification_id"),
    fitting_type: str("fitting_type"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  }
  const f = parsed.data;
  const db = supabaseAdmin();

  let identificationId = f.identification_id ?? null;
  if (identificationId) {
    const { error } = await db.from("identifications").update({ handed_off: true }).eq("id", identificationId);
    if (error) return NextResponse.json({ error: "We couldn't find that search. Please try again." }, { status: 404 });
  } else {
    // No AI run yet: store the photos on a new identification so staff can see them.
    const files = form.getAll("photos").filter((x): x is File => x instanceof File).slice(0, MAX_PHOTOS);
    const id = crypto.randomUUID();
    const paths: string[] = [];
    for (const [i, file] of files.entries()) {
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "One photo is too large (max 8MB)." }, { status: 413 });
      const buf = Buffer.from(await file.arrayBuffer());
      const type = sniffImage(buf);
      if (!type) return NextResponse.json({ error: "Please upload JPEG, PNG or WebP photos." }, { status: 415 });
      const path = `${id}/${i}.${type.split("/")[1].replace("jpeg", "jpg")}`;
      const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, buf, { contentType: type });
      if (error) return NextResponse.json({ error: "Couldn't save your photos. Please try again." }, { status: 502 });
      paths.push(path);
    }
    const { error } = await db
      .from("identifications")
      .insert({ id, fitting_type: f.fitting_type ?? null, image_paths: paths, handed_off: true, rounds: 0 });
    if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
    identificationId = id;
  }

  const { data, error } = await db
    .from("tickets")
    .insert({ identification_id: identificationId, customer_name: f.name, customer_email: f.email, notes: f.notes })
    .select("id")
    .single();
  if (error) {
    console.error("ticket insert failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ticket_id: data.id, reference: `PM-${String(data.id).slice(0, 6).toUpperCase()}` });
}
