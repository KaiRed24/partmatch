import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimited } from "@/lib/images";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyChoiceToken } from "@/lib/tokens";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(10).max(300), choice: z.enum(["wait", "part_ship", "refund"]) });
const STATUS = { wait: "delayed", part_ship: "part_shipped", refund: "refunded" } as const;

/** The customer's Wait / Part-ship / Refund answer from the email link. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`choice:${ip}`, 10)) return NextResponse.json({ error: "Too many tries. Please wait a minute." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const orderId = verifyChoiceToken(parsed.data.token);
  if (!orderId) return NextResponse.json({ error: "This link has expired. Please contact us and we'll sort it out." }, { status: 401 });

  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("id,status,choice_token,customer_choice").eq("id", orderId).single();
  if (!order || order.choice_token !== parsed.data.token) {
    return NextResponse.json({ error: "This link is out of date. Please use the most recent email from us." }, { status: 410 });
  }
  if (order.customer_choice === "refund" || order.status === "dispatched") {
    return NextResponse.json({ error: "This order has already been dealt with. Please contact us if you need to change it." }, { status: 409 });
  }

  const { choice } = parsed.data;
  const { error } = await db.from("orders").update({ customer_choice: choice, status: STATUS[choice] }).eq("id", order.id);
  if (error) return NextResponse.json({ error: "Couldn't save your choice. Please try again." }, { status: 502 });
  await db.from("notifications").insert({ order_id: order.id, type: "customer_choice", payload: { choice, previous: order.customer_choice } });
  return NextResponse.json({ ok: true, choice });
}
