import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyChoiceToken } from "@/lib/tokens";
import ChoiceForm from "./ChoiceForm";

export const metadata: Metadata = { title: "Your delayed order · PartMatch", robots: { index: false } };
export const dynamic = "force-dynamic";

type Choice = "wait" | "part_ship" | "refund";
const CHOICES: Choice[] = ["wait", "part_ship", "refund"];

const ukDate = (iso: string | null) =>
  iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" })
    : "";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{body}</p>
    </div>
  );
}

/**
 * Landing page for the email buttons. The button pre-selects an option, but nothing changes until the customer
 * presses Confirm: email scanners often "click" links automatically, so a plain link must never change an order.
 */
export default async function ChoicePage({ searchParams }: { searchParams: { token?: string; choice?: string } }) {
  const token = searchParams.token ?? "";
  const orderId = token ? verifyChoiceToken(token) : null;

  let content: JSX.Element;
  if (!orderId) {
    content = <Message title="This link has expired" body="Please contact our team and we'll sort out your order for you." />;
  } else {
    const db = supabaseAdmin();
    const { data: order } = await db
      .from("orders")
      .select("order_ref,customer_name,status,promised_date,revised_date,customer_choice,choice_token,product_id")
      .eq("id", orderId)
      .single();
    if (!order || order.choice_token !== token) {
      content = <Message title="This link is out of date" body="We've sent you a newer email about this order. Please use the link in that one." />;
    } else if (order.customer_choice === "refund" || order.status === "dispatched") {
      content = (
        <Message
          title="This order has already been dealt with"
          body={order.customer_choice === "refund" ? "This item is being refunded." : "Your order is on its way."}
        />
      );
    } else {
      const { data: product } = await db.from("products").select("name,product_code").eq("id", order.product_id).single();
      const pre = CHOICES.includes(searchParams.choice as Choice) ? (searchParams.choice as Choice) : null;
      content = (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-brand-accent">Order {order.order_ref}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Sorry, part of your order is delayed</h1>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Delayed item</p>
            <p className="font-semibold text-slate-900">{product?.name}</p>
            <p className="text-sm text-slate-500">Product code {product?.product_code}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Originally</dt>
                <dd className="text-slate-400 line-through">{ukDate(order.promised_date)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Now expected by</dt>
                <dd className="font-semibold text-slate-900">{ukDate(order.revised_date)}</dd>
              </div>
            </dl>
          </div>
          <ChoiceForm token={token} preselected={pre} current={(order.customer_choice as Choice | null) ?? null} />
        </div>
      );
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">{content}</main>
    </>
  );
}
