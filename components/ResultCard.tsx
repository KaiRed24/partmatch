"use client";
import type { Match } from "@/lib/identify";
import { CATEGORY_LABELS, type Category } from "@/lib/schemas";
import ReturnsWarning from "./ReturnsWarning";
import StockBadge from "./StockBadge";

const gbp = (n: number | null) => (n == null ? "" : `£${n.toFixed(2)}`);

export function MatchSummary({ m, compact = false }: { m: Match; compact?: boolean }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {CATEGORY_LABELS[m.category as Category] ?? m.category}
            {m.brand ? ` · ${m.brand}` : ""}
          </p>
          <h3 className={`${compact ? "text-base" : "text-lg"} mt-0.5 font-bold leading-snug text-slate-900`}>{m.name}</h3>
          <p className="mt-0.5 text-sm text-slate-500">Product code {m.product_code}</p>
        </div>
        <p className={`${compact ? "text-base" : "text-xl"} shrink-0 font-bold text-brand`}>{gbp(m.price_gbp)}</p>
      </div>
      <div className="mt-3">
        <StockBadge badge={m.stock} />
      </div>
    </div>
  );
}

export default function ResultCard({
  matches,
  confidence,
  unsure,
  onChoose,
  onExpert,
}: {
  matches: Match[];
  confidence: number;
  unsure: boolean;
  onChoose: (m: Match) => void;
  onExpert: () => void;
}) {
  const [best, ...alts] = matches;
  if (!best) return null;
  const why = best.reason ? [best.reason, ...best.matched] : best.matched;
  const pct = Math.round(confidence * 100);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-accent">{unsure ? "Our best guess" : "We think this is your part"}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{unsure ? "Let our team confirm this one" : "Your match"}</h2>
        {unsure && (
          <p className="mt-1 text-sm text-slate-600">
            We couldn&apos;t be certain from the photos, so we&apos;d rather a specialist checked before you order.
          </p>
        )}
      </div>

      <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <MatchSummary m={best} />
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Match confidence</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${confidence >= 0.75 ? "bg-emerald-500" : confidence >= 0.5 ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {why.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-900">Why this matches</p>
            <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
              {why.slice(0, 5).map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="font-bold text-emerald-600" aria-hidden>
                    ✓
                  </span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4">
          <ReturnsWarning category={best.category} returnable={best.returnable} restockingFee={best.restocking_fee} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => onChoose(best)}
            className={`rounded-xl py-3 font-semibold ${unsure ? "text-brand ring-1 ring-brand hover:bg-brand/5" : "bg-brand text-white hover:bg-brand-dark"}`}
          >
            This is my part
          </button>
          <button
            onClick={onExpert}
            className={`rounded-xl py-3 font-semibold ${unsure ? "bg-brand text-white hover:bg-brand-dark" : "text-brand ring-1 ring-brand hover:bg-brand/5"}`}
          >
            Ask an expert to confirm
          </button>
        </div>
      </article>

      {alts.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-900">Close alternatives</p>
          <div className="mt-2 space-y-3">
            {alts.map((m) => (
              <article key={m.product_code} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <MatchSummary m={m} compact />
                {m.reason && <p className="mt-2 text-sm text-slate-600">{m.reason}</p>}
                <button onClick={() => onChoose(m)} className="mt-3 text-sm font-semibold text-brand underline underline-offset-2">
                  This one is my part
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
