/**
 * [2] Retrieval (plan section 7): category filter, exact-match boost on readable markings,
 * numeric/attribute closeness, and vector similarity. Returns the top 8 candidates for the rerank.
 * Takes the Supabase client as an argument so scripts can use it outside Next.js.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "./embeddings";
import { CATEGORY_LABELS, type Category, type Extraction, type ProductAttributes } from "./schemas";

export type ProductRow = {
  id: string;
  product_code: string;
  name: string;
  category: Category;
  brand: string | null;
  compatible_with: string[] | null;
  attributes: ProductAttributes;
  description: string | null;
  price_gbp: number | null;
  returnable: boolean;
  restocking_fee: boolean;
  stock: { qty_on_hand: number; supplier_lead_days: number | null; replacement_product_id: string | null } | null;
};

export type Candidate = ProductRow & { similarity: number; score: number; matched: string[]; conflicts: string[] };

export type Answers = Record<string, string | number | boolean>;

const NUMERIC_KEYS = ["length_mm", "height_mm", "diameter_mm", "hole_spacing_mm", "spline_length_mm", "button_hole_mm"];
const CHOICE_KEYS = [
  "size", "turn", "closing", "thread", "single_pair", "base_type", "spindle_type",
  "operation", "button_type", "entry", "thread_size", "shank", "fixing", "soft_close", "telescopic",
];

const LABELS: Record<string, string> = {
  length_mm: "Length", height_mm: "Height", diameter_mm: "Diameter", hole_spacing_mm: "Hole spacing",
  spline_length_mm: "Spline length", button_hole_mm: "Button hole", splines: "Splines", size: "Size",
  turn: "Turn", closing: "Closes", thread: "Collar", single_pair: "Single/pair", base_type: "Base",
  spindle_type: "Spindle", operation: "Operation", button_type: "Button", entry: "Entry",
  thread_size: "Thread", shank: "Shank", fixing: "Fixing", soft_close: "Soft close", telescopic: "Telescopic",
};

/** Uppercase letters and digits only, so "DISC 045" and "disc-045" compare equal. */
const norm = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
/** Lowercase words, so "Side entry", "side" and "1/4 turn (90 degrees)" vs "1/4" can be compared. */
const normChoice = (s: unknown) => {
  const t = String(s ?? "").toLowerCase().replace(/["'“”]/g, "").replace(/[()\-_,]/g, " ").replace(/\s+/g, " ").trim();
  return t === "yes" ? "true" : t === "no" ? "false" : t;
};
/** Same value, or one is the other plus extra words ("1/4 turn (90 degrees)" ~ "1/4"). "anti clockwise" never matches "clockwise". */
const sameChoice = (a: string, b: string) => a === b || a.startsWith(b + " ") || b.startsWith(a + " ");
const isUnknown = (v: unknown) => v == null || v === "" || /^not sure$/i.test(String(v)) || /^null$/i.test(String(v));

let productCache: { at: number; rows: ProductRow[] } | null = null;

export async function loadProducts(db: SupabaseClient): Promise<ProductRow[]> {
  if (productCache && Date.now() - productCache.at < 60_000) return productCache.rows;
  const [{ data: products, error }, { data: stock, error: sErr }] = await Promise.all([
    db.from("products").select("id,product_code,name,category,brand,compatible_with,attributes,description,price_gbp,returnable,restocking_fee"),
    db.from("stock").select("product_id,qty_on_hand,supplier_lead_days,replacement_product_id"),
  ]);
  if (error) throw error;
  if (sErr) throw sErr;
  const stockOf = new Map((stock ?? []).map((s) => [s.product_id, s]));
  const rows = (products ?? []).map((p) => ({ ...p, price_gbp: p.price_gbp == null ? null : Number(p.price_gbp), stock: stockOf.get(p.id) ?? null })) as ProductRow[];
  productCache = { at: Date.now(), rows };
  return rows;
}

/** Text used to embed the photo reading, in the same style as the product descriptions. */
function queryText(ex: Extraction, answers: Answers): string {
  const attrs = { ...ex.attributes, ...answers };
  const parts = [
    ex.category !== "unknown" ? CATEGORY_LABELS[ex.category] : "",
    ex.brand_guess ?? "",
    ...ex.visible_text,
    ...Object.entries(attrs)
      .filter(([, v]) => !isUnknown(v))
      .map(([k, v]) => `${k.replace(/_mm$/, "").replace(/_/g, " ")} ${v}${k.endsWith("_mm") ? "mm" : ""}`),
  ];
  return parts.filter(Boolean).join(". ");
}

function scoreMarkings(p: ProductRow, ex: Extraction): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];
  const code = norm(p.product_code);
  const tokens = ex.visible_text.flatMap((t) => [t, ...t.split(/\s+/)]).map(norm).filter((t) => t.length >= 3);

  const codeHit = tokens.find((t) => t === code || (t.length >= 4 && code.includes(t)) || (code.length >= 4 && t.includes(code)));
  if (codeHit) {
    score += 1.5;
    matched.push(`Code ${p.product_code} matches the marking on your part`);
  } else {
    // Partial: digits on the part that are the whole number part of the code ("045" on a DISC045),
    // or a long run (5+) inside it. A short run like "415" inside "00622415" is too likely to be chance.
    const codeDigits = code.replace(/[^0-9]/g, "");
    const digitRuns = tokens.flatMap((t) => t.match(/\d{3,}/g) ?? []);
    const run = digitRuns.find((d) => d === codeDigits || (d.length >= 5 && codeDigits.includes(d)));
    if (run) {
      score += 0.6;
      matched.push(`Marking "${run}" appears in the code ${p.product_code}`);
    }
  }

  // A brand printed on the part is strong evidence; a brand the model only guessed from the shape is weak.
  const brand = norm(p.brand);
  if (brand.length >= 3 && !["GENERIC", "BSP", "EBATHS"].includes(brand)) {
    const hit = (t: string) => t.includes(brand) || (t.length >= 4 && brand.includes(t));
    if (tokens.some(hit)) {
      score += 0.6;
      matched.push(`Brand ${p.brand} is printed on your part`);
    } else if (hit(norm(ex.brand_guess))) {
      score += 0.15;
      matched.push(`Looks like a ${p.brand} part`);
    }
  }
  for (const range of p.compatible_with ?? []) {
    const r = norm(range);
    if (r.length >= 4 && tokens.some((t) => t.includes(r) || r.includes(t))) {
      score += 0.3;
      matched.push(`Fits ${range}`);
      break;
    }
  }
  return { score, matched };
}

function scoreAttributes(p: ProductRow, ex: Extraction, answers: Answers) {
  let score = 0;
  const matched: string[] = [];
  const conflicts: string[] = [];
  const pa = p.attributes ?? {};
  const photo: Record<string, unknown> = { ...ex.attributes };
  if (photo.length_mm == null && photo.estimated_length_mm != null) photo.length_mm = photo.estimated_length_mm;
  const unsure = new Set(ex.uncertain_about.map((u) => u.toLowerCase()));

  const read = (k: string): { v: unknown; trusted: boolean } | null => {
    if (k in answers && !isUnknown(answers[k])) return { v: answers[k], trusted: true };
    if (!isUnknown(photo[k])) return { v: photo[k], trusted: ex.ruler_visible && !unsure.has(k) };
    return null;
  };

  // Spline count: exact or wrong.
  const sp = read("splines");
  if (sp && pa.splines != null) {
    const n = parseInt(String(sp.v), 10); // accepts "24" and "24 splines"
    if (n === Number(pa.splines)) {
      score += sp.trusted ? 0.5 : 0.25;
      matched.push(`${pa.splines} splines`);
    } else if (!Number.isNaN(n)) {
      score -= sp.trusted ? 0.8 : unsure.has("splines") ? 0.05 : 0.25;
      conflicts.push(`Splines: yours ${n}, this ${pa.splines}`);
    }
  }

  for (const k of NUMERIC_KEYS) {
    const r = read(k);
    if (!r) continue;
    const yours = Number(r.v);
    if (Number.isNaN(yours) || yours <= 0) continue;
    const exact = pa[k] != null ? Number(pa[k]) : null;
    const rangeRaw = pa[k.replace(/_mm$/, "_range_mm")];
    const range = typeof rangeRaw === "string" ? rangeRaw.split("-").map(Number) : null;
    const label = LABELS[k] ?? k;
    if (range && range.length === 2) {
      if (yours >= range[0] - 2 && yours <= range[1] + 2) {
        score += r.trusted ? 0.3 : 0.1;
        matched.push(`${label} ${yours}mm is within ${rangeRaw}mm`);
      } else {
        score -= r.trusted ? 0.6 : 0.1;
        conflicts.push(`${label}: yours ${yours}mm, this fits ${rangeRaw}mm`);
      }
      continue;
    }
    if (exact == null) continue;
    const diff = Math.abs(yours - exact);
    if (r.trusted) {
      const tol = k === "diameter_mm" ? 1 : 1.2; // near-twin parts differ by as little as 1.5mm
      if (diff <= tol) {
        score += 0.4;
        matched.push(`${label} ${exact}mm`);
      } else if (diff <= tol * 2.5) {
        score += 0.05;
      } else {
        score -= 0.6;
        conflicts.push(`${label}: yours ${yours}mm, this ${exact}mm`);
      }
    } else {
      // Estimated from a photo without a ruler: only a soft nudge.
      const rel = diff / exact;
      if (rel <= 0.05) score += 0.12;
      else if (rel <= 0.12) score += 0.04;
      else if (rel > 0.25) score -= 0.1;
    }
  }

  for (const k of CHOICE_KEYS) {
    const r = read(k);
    if (!r || pa[k] == null) continue;
    const mine = normChoice(r.v);
    const theirs = normChoice(pa[k]);
    // "anti-clockwise (hot) & clockwise (cold)" pairs fit either direction.
    const ok = sameChoice(mine, theirs) || (k === "closing" && String(pa[k]).includes("&"));
    const weak = k === "single_pair" && !r.trusted; // listings often photograph two of a single part
    if (weak) continue;
    if (ok) {
      score += r.trusted ? 0.4 : 0.15;
      matched.push(`${LABELS[k] ?? k}: ${pa[k]}`);
    } else {
      score -= r.trusted ? 0.8 : 0.15;
      conflicts.push(`${LABELS[k] ?? k}: yours ${r.v}, this ${pa[k]}`);
    }
  }
  return { score, matched, conflicts };
}

export async function retrieveCandidates(opts: {
  db: SupabaseClient;
  extraction: Extraction;
  answers?: Answers;
  allowedCategories?: Category[];
  limit?: number;
}): Promise<Candidate[]> {
  const { db, extraction: ex } = opts;
  const answers = opts.answers ?? {};
  const products = await loadProducts(db);

  const pool = products.filter((p) =>
    ex.category !== "unknown"
      ? p.category === ex.category
      : !opts.allowedCategories?.length || opts.allowedCategories.includes(p.category),
  );
  if (!pool.length) return [];

  const [qv] = await embed([queryText(ex, answers)], "query");
  const { data: hits, error } = await db.rpc("match_products", {
    query_embedding: qv,
    filter_category: ex.category !== "unknown" ? ex.category : null,
    match_count: 200,
  });
  if (error) throw error;
  const simOf = new Map<string, number>((hits ?? []).map((h: { id: string; similarity: number }) => [h.id, h.similarity]));
  const sims = pool.map((p) => simOf.get(p.id) ?? 0);
  const lo = Math.min(...sims);
  const hi = Math.max(...sims);

  const scored = pool.map((p) => {
    const similarity = simOf.get(p.id) ?? 0;
    const vec = hi > lo ? (similarity - lo) / (hi - lo) : 0.5;
    const m = scoreMarkings(p, ex);
    const a = scoreAttributes(p, ex, answers);
    return {
      ...p,
      similarity,
      score: 0.5 * vec + m.score + a.score,
      matched: [...m.matched, ...a.matched],
      conflicts: a.conflicts,
    };
  });
  return scored.sort((x, y) => y.score - x.score).slice(0, opts.limit ?? 8);
}
