import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const Body = z.object({ product_code: z.string().trim().min(1).max(40) });

/** Staff confirm the right part for an enquiry. resolved_product_id is the training signal for future tuning. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a product code." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: product } = await db.from("products").select("id,name").ilike("product_code", parsed.data.product_code).maybeSingle();
  if (!product) return NextResponse.json({ error: `No product with code ${parsed.data.product_code}.` }, { status: 404 });

  const { data: ticket, error } = await db
    .from("tickets")
    .update({ status: "resolved", resolved_product_id: product.id })
    .eq("id", params.id)
    .select("identification_id")
    .single();
  if (error || !ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  return NextResponse.json({ ok: true, product: product.name });
}
