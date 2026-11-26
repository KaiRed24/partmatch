import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const Body = z.object({ identification_id: z.string().uuid(), product_code: z.string().min(1).max(40) });

/** Records which match the customer picked ("This is my part"). Feeds the staff stats. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: product } = await db.from("products").select("id").eq("product_code", parsed.data.product_code).single();
  if (!product) return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  const { error } = await db
    .from("identifications")
    .update({ chosen_product_id: product.id })
    .eq("id", parsed.data.identification_id);
  if (error) return NextResponse.json({ error: "Couldn't save your choice." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
