import type { Metadata } from "next";
import Link from "next/link";
import CartridgeDiagram from "@/components/CartridgeDiagram";
import StockBadge from "@/components/StockBadge";
import { stockBadge } from "@/lib/stock";
import { supabaseAdmin } from "@/lib/supabase";

export const metadata: Metadata = { title: "Demo product page · PartMatch" };
export const dynamic = "force-dynamic"; // the despatch countdown depends on the time of day

const CODE = "DISC018";

/** Mock product page in the style of a UK spares shop, showing where the "Find my part" entry point would sit. */
export default async function DemoShop() {
  const db = supabaseAdmin();
  const { data: p } = await db
    .from("products")
    .select("id,product_code,name,brand,attributes,description,price_gbp")
    .eq("product_code", CODE)
    .single();
  const { data: s } = p
    ? await db.from("stock").select("qty_on_hand,supplier_lead_days").eq("product_id", p.id).single()
    : { data: null };

  const a = (p?.attributes ?? {}) as Record<string, string | number>;
  const specs: [string, string][] = [
    ["MPN", CODE],
    ["Splines", String(a.splines ?? "")],
    ["Spline diameter", a.spline_diameter_mm ? `${a.spline_diameter_mm}mm` : ""],
    ["Measurement A / B / C / D", "57 / 34 / 23 / 12mm"],
    ["Length", a.length_mm ? `${a.length_mm}mm` : ""],
    ["Single / pair", String(a.single_pair ?? "")],
    ["Thread", String(a.thread ?? "")],
    ["Closing", String(a.closing ?? "")],
    ["Brand", p?.brand ?? ""],
    ["Product code", CODE],
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand-dark px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        Same-day despatch on orders by 12:30pm, Mon–Fri · Free UK delivery over £150
      </div>
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <p className="text-xl font-bold tracking-tight text-brand">
            Bathroom<span className="text-brand-accent">Spares</span>
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase text-amber-800">
              Demo
            </span>
          </p>
          <div className="hidden flex-1 sm:block">
            <div className="mx-auto max-w-sm rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-400">Search by part, brand or code</div>
          </div>
          <span className="text-sm font-medium text-slate-600">Basket (0)</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4">
        <nav className="text-xs text-slate-500" aria-label="Breadcrumb">
          Tap spares › Ceramic disc cartridges › 1/2&quot; 1/4 turn
        </nav>

        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <div className="flex items-center justify-center rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
            <CartridgeDiagram className="h-72 w-auto" />
          </div>

          <div>
            <p className="text-sm text-slate-500">{p?.brand}</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">{p?.name ?? "Ceramic disc cartridge"}</h1>
            <p className="mt-1 text-sm text-slate-500">Product code {CODE}</p>
            <p className="mt-4 text-3xl font-bold text-brand">£{Number(p?.price_gbp ?? 0).toFixed(2)}</p>
            <p className="text-xs text-slate-500">inc. VAT · fictional demo price</p>
            {s && (
              <div className="mt-4">
                <StockBadge badge={stockBadge({ qty_on_hand: s.qty_on_hand, supplier_lead_days: s.supplier_lead_days })} />
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <div className="flex w-24 items-center justify-between rounded-lg px-3 ring-1 ring-slate-300">
                <span className="text-slate-400">−</span>1<span className="text-slate-400">+</span>
              </div>
              <button disabled className="flex-1 cursor-not-allowed rounded-lg bg-brand py-3 font-semibold text-white opacity-60">
                Add to basket
              </button>
            </div>

            <Link
              href="/find-my-part?type=tap"
              className="group mt-5 flex items-center gap-4 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200 transition hover:ring-2 hover:ring-brand-accent"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent text-white">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
                  <path d="M9 4 7.2 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.2L15 4H9Zm3 4.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
                </svg>
              </span>
              <span>
                <span className="block font-semibold text-slate-900">Not sure this is your part?</span>
                <span className="block text-sm text-slate-600">
                  Find my part from a photo: free, instant, and checked against the same measurements our team uses.
                </span>
              </span>
              <span className="ml-auto text-xl text-brand-accent transition group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </Link>

            <p className="mt-4 text-sm text-slate-600">{p?.description}</p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Specification</h2>
          <dl className="mt-3 divide-y divide-slate-200 rounded-xl ring-1 ring-slate-200">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-2 gap-4 px-4 py-2.5 text-sm">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-10 text-center text-xs text-slate-400">
          Prototype mock-up for a job application. Product data is a hand-entered sample; prices and stock are fictional.
        </p>
      </main>
    </div>
  );
}
