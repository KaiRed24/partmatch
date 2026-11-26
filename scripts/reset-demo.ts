/**
 * Resets the demo to a clean state before showing it: clears photo searches, expert enquiries, sent-email logs and
 * uploaded customer photos, and puts the 12 demo orders back to their starting status and dates.
 * The product catalogue, stock and search embeddings are left alone.
 * Usage: npm run reset-demo
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { ORDERS } from "../data/orders";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const NONE = "00000000-0000-0000-0000-000000000000";
const BUCKET = "part-photos";

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${JSON.stringify(error)}`);
  return data;
}

async function clearPhotos(): Promise<number> {
  let removed = 0;
  const folders = (await must(db.storage.from(BUCKET).list("", { limit: 1000 }), "list photos")) ?? [];
  for (const f of folders) {
    const files = (await must(db.storage.from(BUCKET).list(f.name, { limit: 100 }), "list folder")) ?? [];
    const paths = files.map((x) => `${f.name}/${x.name}`);
    if (paths.length) {
      await must(db.storage.from(BUCKET).remove(paths), "remove photos");
      removed += paths.length;
    }
  }
  return removed;
}

async function main() {
  for (const t of ["notifications", "tickets", "orders", "identifications"]) {
    await must(db.from(t).delete().neq("id", NONE), `clear ${t}`);
  }
  const photos = await clearPhotos();

  const products = (await must(db.from("products").select("id,product_code"), "load products")) ?? [];
  const idOf = new Map(products.map((p: { id: string; product_code: string }) => [p.product_code, p.id]));
  const email = process.env.DEMO_ORDER_EMAIL || "demo@example.com";
  const today = new Date();
  await must(
    db.from("orders").insert(
      ORDERS.map((o) => {
        const d = new Date(today);
        d.setDate(d.getDate() + o.promised_in_days);
        return {
          order_ref: o.ref,
          customer_name: o.customer,
          customer_email: email,
          product_id: idOf.get(o.product_code),
          status: o.status,
          promised_date: d.toISOString().slice(0, 10),
        };
      }),
    ),
    "reload orders",
  );

  console.log(`Demo reset: searches, enquiries and email logs cleared, ${photos} uploaded photos removed, ${ORDERS.length} orders restored.`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
