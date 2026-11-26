import type { StockBadge as Badge } from "@/lib/stock";

const TONES: Record<Badge["tone"], string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-800 ring-rose-200",
};
const DOTS: Record<Badge["tone"], string> = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-rose-500" };

export default function StockBadge({ badge }: { badge: Badge }) {
  return (
    <p className={`inline-flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 ${TONES[badge.tone]}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOTS[badge.tone]}`} aria-hidden />
      {badge.label}
    </p>
  );
}
