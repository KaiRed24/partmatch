/**
 * Loads data/catalogue.ts + data/orders.ts into Supabase via the API (alternative to pasting seed.sql).
 * Wipes and reloads products, stock and orders. Usage: npx tsx scripts/seed.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { CATALOGUE } from "../data/catalogue";
import { ORDERS } from "../data/orders";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const email = process.env.DEMO_ORDER_EMAIL || "demo@example.com";
const NONE = "00000000-0000-0000-0000-000000000000";

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${JSON.stringify(error)}`);
  return data;
}

async function main() {
  // Clear in dependency order.
  for (const t of ["notifications", "orders", "tickets", "identifications", "stock", "products"]) {
    const pk = t === "stock" ? "product_id" : "id";
    await must(db.from(t).delete().neq(pk, NONE), `clear ${t}`);
  }

  const inserted = await must(
    db
      .from("products")
      .insert(
        CATALOGUE.map((p) => ({
          product_code: p.code,
          name: p.name,
          category: p.category,
          brand: p.brand,
          compatible_with: p.compatible_with ?? [],
          attributes: JSON.parse(JSON.stringify(p.attributes)),
          returnable: p.returnable ?? true,
          restocking_fee: p.restocking_fee ?? false,
          description: p.description,
          price_gbp: p.price,
        })),
      )
      .select("id,product_code"),
    "insert products",
  );
  const idOf = new Map((inserted ?? []).map((r: { id: string; product_code: string }) => [r.product_code, r.id]));

  await must(
    db.from("stock").insert(
      CATALOGUE.map((p) => ({
        product_id: idOf.get(p.code),
        qty_on_hand: p.stock.qty,
        supplier_lead_days: p.stock.lead_days ?? null,
        replacement_product_id: p.stock.replacement ? idOf.get(p.stock.replacement) : null,
      })),
    ),
    "insert stock",
  );

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
    "insert orders",
  );

  const count = async (t: string) => (await db.from(t).select("*", { count: "exact", head: true })).count;
  console.log(`Loaded: ${await count("products")} products, ${await count("stock")} stock rows, ${await count("orders")} orders (emails → ${email})`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
