import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { sendDelayEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";
import { createChoiceToken } from "@/lib/tokens";

export const runtime = "nodejs";

const Body = z.object({
  revised_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-12-04."),
  reason: z.string().trim().max(300).optional(),
});

/**
 * Staff action "Mark delayed" (plan section 8): set the new date, issue a fresh choice token,
 * email the customer Wait / Part-ship / Refund links, and log the notification.
 * [id] is the order's uuid or its reference (e.g. BSP-100231).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });

  const db = supabaseAdmin();
  const column = /^BSP-\d+$/i.test(params.id) ? "order_ref" : "id";
  const { data: order, error } = await db
    .from("orders")
    .select("id,order_ref,customer_name,customer_email,status,promised_date,product_id")
    .eq(column, params.id.toUpperCase().startsWith("BSP-") ? params.id.toUpperCase() : params.id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (["dispatched", "refunded"].includes(order.status)) {
    return NextResponse.json({ error: `This order is already ${order.status}.` }, { status: 409 });
  }
  if (order.promised_date && parsed.data.revised_date <= order.promised_date) {
    return NextResponse.json({ error: "The new date should be after the original promised date." }, { status: 400 });
  }

  const { data: product } = await db.from("products").select("name,product_code").eq("id", order.product_id).single();
  const token = createChoiceToken(order.id);
  const base = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");
  const link = (choice: string) => `${base}/order/choice?token=${encodeURIComponent(token)}&choice=${choice}`;

  // Save first, so the links work by the time the email lands.
  const { error: uErr } = await db
    .from("orders")
    .update({ status: "delayed", revised_date: parsed.data.revised_date, choice_token: token, customer_choice: null })
    .eq("id", order.id);
  if (uErr) return NextResponse.json({ error: "Couldn't update the order." }, { status: 502 });

  let sent;
  try {
    sent = await sendDelayEmail({
      to: order.customer_email,
      customerName: order.customer_name,
      orderRef: order.order_ref,
      productName: product?.name ?? "item",
      productCode: product?.product_code ?? "",
      promisedDate: order.promised_date,
      revisedDate: parsed.data.revised_date,
      reason: parsed.data.reason ?? null,
      links: { wait: link("wait"), part_ship: link("part_ship"), refund: link("refund") },
    });
  } catch (err) {
    console.error("delay email failed", err);
    await db.from("notifications").insert({
      order_id: order.id,
      type: "delay_email_failed",
      payload: { error: (err as Error).message, revised_date: parsed.data.revised_date },
    });
    return NextResponse.json(
      { error: "The order is marked delayed, but the email didn't send. Check the email settings and try again." },
      { status: 502 },
    );
  }

  await db.from("notifications").insert({
    order_id: order.id,
    type: "delay_email",
    payload: {
      channel: sent.channel,
      provider_id: sent.id ?? null,
      to: order.customer_email,
      subject: sent.subject,
      html: sent.html,
      revised_date: parsed.data.revised_date,
      reason: parsed.data.reason ?? null,
    },
  });

  return NextResponse.json({ ok: true, channel: sent.channel, order_ref: order.order_ref, preview_links: sent.channel === "preview" ? { wait: link("wait") } : undefined });
}
