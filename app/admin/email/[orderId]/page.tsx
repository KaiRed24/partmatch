import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata: Metadata = { title: "Customer email · PartMatch", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Shows staff (and anyone testing the demo) the exact delay email the customer received, with working buttons.
 * Demo emails only reach the site owner's inbox, so this is how testers see the customer side of the automation.
 */
export default async function EmailPreview({ params }: { params: { orderId: string } }) {
  if (!isAdmin()) redirect("/admin/login");
  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("id,order_ref,customer_name").eq("id", params.orderId).maybeSingle();
  const { data: note } = order
    ? await db
        .from("notifications")
        .select("payload,sent_at")
        .eq("order_id", order.id)
        .eq("type", "delay_email")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const payload = (note?.payload ?? null) as { subject?: string; html?: string; channel?: string } | null;
  // Links inside the email open in the full window, not inside the preview frame.
  const html = payload?.html?.replace("<html>", '<html><head><base target="_top"></head>');
  const sent = note?.sent_at
    ? new Date(note.sent_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <p className="text-lg font-bold">
            Part<span className="text-sky-300">Match</span> <span className="font-medium text-white/70">staff</span>
          </p>
          <Link href="/admin#orders" className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25">
            ← Back to orders
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        {!order || !html ? (
          <p className="rounded-xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-200">No delay email has been sent for this order yet.</p>
        ) : (
          <>
            <div className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email sent to {order.customer_name}</p>
              <p className="mt-1 font-semibold text-slate-900">{payload?.subject}</p>
              <p className="mt-0.5 text-slate-500">
                {order.order_ref} · {sent}
                {payload?.channel === "preview" ? " · preview only, not sent" : ""}
              </p>
              <p className="mt-3 rounded-lg bg-sky-50 p-3 text-sky-900 ring-1 ring-sky-200">
                This is exactly what the customer receives. Try a button: it opens the customer&apos;s page, and their answer
                then shows on the dashboard. Demo emails are delivered to the site owner&apos;s inbox, not to the fictional
                customer.
              </p>
            </div>
            <iframe
              title={`Delay email for ${order.order_ref}`}
              srcDoc={html}
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
              className="mt-4 h-[760px] w-full rounded-xl bg-white ring-1 ring-slate-200"
            />
          </>
        )}
      </main>
    </div>
  );
}
