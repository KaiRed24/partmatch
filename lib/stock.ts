/**
 * Stock badge + despatch cutoff logic (UK time).
 * Pure functions so they can be unit-tested and used on client or server.
 */

export type StockRow = {
  qty_on_hand: number;
  supplier_lead_days: number | null;
  replacement?: { product_code: string; name: string } | null;
};

export type StockBadge =
  | { tone: "green"; label: string }
  | { tone: "amber"; label: string }
  | { tone: "red"; label: string; replacementCode?: string };

function ukParts(now: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return { weekday: parts.weekday as string, hour: Number(parts.hour), minute: Number(parts.minute) };
}

/** Minutes left until today's despatch cutoff, or null if it has passed / it's the weekend. */
export function minutesToCutoff(now: Date = new Date(), cutoff = process.env.DESPATCH_CUTOFF ?? "12:30"): number | null {
  const { weekday, hour, minute } = ukParts(now);
  if (weekday === "Sat" || weekday === "Sun") return null;
  const [ch, cm] = cutoff.split(":").map(Number);
  const left = ch * 60 + cm - (hour * 60 + minute);
  return left > 0 ? left : null;
}

export function stockBadge(stock: StockRow, now: Date = new Date()): StockBadge {
  if (stock.qty_on_hand > 0) {
    const left = minutesToCutoff(now);
    if (left !== null) {
      const h = Math.floor(left / 60);
      const m = left % 60;
      const time = h > 0 ? `${h}h ${m}m` : `${m}m`;
      return { tone: "green", label: `In stock — order in the next ${time} for same-day despatch` };
    }
    return { tone: "green", label: "In stock — despatched next working day" };
  }
  if (stock.supplier_lead_days != null) {
    const n = stock.supplier_lead_days;
    return { tone: "amber", label: `Supplier item — usually ${n} working day${n === 1 ? "" : "s"}` };
  }
  return {
    tone: "red",
    label: stock.replacement
      ? `Discontinued — compatible alternative: ${stock.replacement.name} (${stock.replacement.product_code})`
      : "Discontinued — ask our team for an alternative",
    replacementCode: stock.replacement?.product_code,
  };
}
