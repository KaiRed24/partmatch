/**
 * The identification pipeline (plan section 7):
 * photos → [1] extraction → [2] retrieval → [3] rerank + confidence
 *   → confident: result  |  unsure: [4] guided questions (max 2 rounds)  |  still unsure: expert handoff.
 * The API routes call these; scripts/eval-photos.ts calls them directly with persist: false.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateJson, type ImageInput } from "./ai";
import { retrieveCandidates, loadProducts, type Answers, type Candidate } from "./match";
import { EXTRACTION_SYSTEM, extractionPrompt, FITTING_CATEGORIES, RERANK_SYSTEM, rerankPrompt } from "./prompts";
import { ExtractionSchema, RerankSchema, type Extraction, type FittingType, type Question } from "./schemas";
import { stockBadge, type StockBadge } from "./stock";
import { PHOTO_BUCKET } from "./supabase";

export const MAX_ROUNDS = 2;
const threshold = () => Number(process.env.CONFIDENCE_THRESHOLD || 0.75);

export type Match = {
  product_code: string;
  name: string;
  brand: string | null;
  category: string;
  price_gbp: number | null;
  returnable: boolean;
  restocking_fee: boolean;
  attributes: Record<string, unknown>;
  score: number;
  reason: string;
  matched: string[];
  stock: StockBadge;
};

export type IdentifyResult = {
  identification_id: string | null;
  status: "result" | "questions" | "handoff";
  confidence: number;
  round: number;
  matches: Match[]; // best first: the top pick plus up to 2 alternatives
  questions: Question[];
  photo_tip: string | null;
  extraction: Extraction;
};

async function rerank(images: ImageInput[], extraction: Extraction, answers: Answers, candidates: Candidate[], askQuestions: boolean) {
  const brief = candidates.map((c) => ({
    product_code: c.product_code,
    name: c.name,
    brand: c.brand,
    attributes: c.attributes,
    description: c.description,
    compatible_with: c.compatible_with,
    retrieval_notes: { matched: c.matched, conflicts: c.conflicts },
  }));
  return generateJson({
    system: RERANK_SYSTEM,
    prompt: rerankPrompt({ extraction, answers, candidates: brief, threshold: threshold(), askQuestions }),
    images,
    schema: RerankSchema,
  });
}

/** Steps [2] and [3], shared by the first pass and each round of answers. */
async function matchAndRank(db: SupabaseClient, images: ImageInput[], extraction: Extraction, answers: Answers, fittingType: FittingType | null, round: number) {
  const candidates = await retrieveCandidates({
    db,
    extraction,
    answers,
    allowedCategories: fittingType ? FITTING_CATEGORIES[fittingType] : undefined,
  });
  if (!candidates.length) {
    return { status: "handoff" as const, confidence: 0, matches: [] as Match[], questions: [] as Question[] };
  }

  const canAsk = round < MAX_ROUNDS;
  const rr = await rerank(images, extraction, answers, candidates, canAsk);

  // Keep only codes we actually sent; anything the model skipped goes after, in retrieval order.
  const byCode = new Map(candidates.map((c) => [c.product_code, c]));
  const seen = new Set<string>();
  const ordered: { c: Candidate; score: number; reason: string }[] = [];
  for (const r of rr.ranked) {
    const c = byCode.get(r.product_code);
    if (c && !seen.has(c.product_code)) {
      seen.add(c.product_code);
      ordered.push({ c, score: r.score, reason: r.reason });
    }
  }
  for (const c of candidates) if (!seen.has(c.product_code)) ordered.push({ c, score: 0, reason: "" });

  let confidence = rr.confidence;
  // A poor photo with no readable code can't support a confident answer on its own.
  const codeMatched = ordered[0]?.c.matched.some((m) => m.startsWith("Code "));
  if (extraction.image_quality === "poor" && !codeMatched && !Object.keys(answers).length) confidence = Math.min(confidence, 0.6);

  const all = await loadProducts(db);
  const byId = new Map(all.map((p) => [p.id, p]));
  const matches: Match[] = ordered.slice(0, 3).map(({ c, score, reason }) => {
    const repl = c.stock?.replacement_product_id ? byId.get(c.stock.replacement_product_id) : null;
    return {
      product_code: c.product_code,
      name: c.name,
      brand: c.brand,
      category: c.category,
      price_gbp: c.price_gbp,
      returnable: c.returnable,
      restocking_fee: c.restocking_fee,
      attributes: c.attributes,
      score,
      reason,
      matched: c.matched,
      stock: stockBadge({
        qty_on_hand: c.stock?.qty_on_hand ?? 0,
        supplier_lead_days: c.stock?.supplier_lead_days ?? null,
        replacement: repl ? { product_code: repl.product_code, name: repl.name } : null,
      }),
    };
  });

  const questions = canAsk ? rr.questions.filter((q) => !q.attribute || !(q.attribute in answers)).map(fixSplineOptions) : [];
  const status: IdentifyResult["status"] =
    confidence >= threshold() ? "result" : questions.length ? "questions" : "handoff";
  return { status, confidence, matches, questions: status === "questions" ? questions : [] };
}

const EXT: Record<ImageInput["mediaType"], string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** First pass: photos in, result / questions / handoff out. */
export async function identify(opts: {
  db: SupabaseClient;
  images: ImageInput[];
  fittingType: FittingType | null;
  persist?: boolean;
}): Promise<IdentifyResult> {
  const { db, images, fittingType } = opts;
  const extraction = await generateJson({
    system: EXTRACTION_SYSTEM,
    prompt: extractionPrompt(fittingType),
    images,
    schema: ExtractionSchema,
  });
  const out = await matchAndRank(db, images, extraction, {}, fittingType, 0);

  let id: string | null = null;
  if (opts.persist !== false) {
    id = crypto.randomUUID();
    const paths = images.map((_, i) => `${id}/${i}.${EXT[images[i].mediaType]}`);
    await Promise.all(
      images.map((img, i) =>
        db.storage.from(PHOTO_BUCKET).upload(paths[i], Buffer.from(img.base64, "base64"), { contentType: img.mediaType }),
      ),
    );
    const { error } = await db.from("identifications").insert({
      id,
      fitting_type: fittingType,
      image_paths: paths,
      extracted: extraction,
      answers: {},
      candidates: out.matches,
      confidence: out.confidence,
      rounds: 0,
    });
    if (error) throw error;
  }

  return {
    identification_id: id,
    round: 0,
    photo_tip: extraction.image_quality === "poor" ? (extraction.photo_tip ?? null) : null,
    extraction,
    ...out,
  };
}

/** Re-run [2] + [3] with answers, without touching the database (used by the eval script). */
export async function refineInMemory(opts: {
  db: SupabaseClient;
  images: ImageInput[];
  extraction: Extraction;
  answers: Answers;
  fittingType: FittingType | null;
  round: number;
}): Promise<IdentifyResult> {
  const out = await matchAndRank(opts.db, opts.images, opts.extraction, opts.answers, opts.fittingType, opts.round);
  return { identification_id: null, round: opts.round, photo_tip: null, extraction: opts.extraction, ...out };
}

/** Each round of guided questions: merge the answers and run [2] + [3] again. */
export async function answer(opts: { db: SupabaseClient; identificationId: string; answers: Answers }): Promise<IdentifyResult> {
  const { db, identificationId } = opts;
  const { data: row, error } = await db
    .from("identifications")
    .select("fitting_type,image_paths,extracted,answers,rounds")
    .eq("id", identificationId)
    .single();
  if (error || !row) throw new Error("Identification not found");

  const extraction = ExtractionSchema.parse(row.extracted);
  const round = (row.rounds ?? 0) + 1;
  const clean = Object.fromEntries(
    Object.entries(opts.answers).filter(([, v]) => v !== "" && v != null && !/^not sure$/i.test(String(v))),
  );
  const answers: Answers = { ...(row.answers ?? {}), ...clean };

  const images: ImageInput[] = [];
  for (const path of (row.image_paths ?? []) as string[]) {
    const { data, error: dErr } = await db.storage.from(PHOTO_BUCKET).download(path);
    if (dErr || !data) continue;
    const ext = path.split(".").pop();
    const mediaType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    images.push({ mediaType, base64: Buffer.from(await data.arrayBuffer()).toString("base64") });
  }

  const out = await matchAndRank(db, images, extraction, answers, row.fitting_type as FittingType | null, round);
  const { error: uErr } = await db
    .from("identifications")
    .update({ answers, candidates: out.matches, confidence: out.confidence, rounds: round })
    .eq("id", identificationId);
  if (uErr) throw uErr;

  return { identification_id: identificationId, round, photo_tip: null, extraction, ...out };
}

/**
 * The model sometimes offers only the spline count it expects (e.g. "20 splines" / "Not sure"), which strands a customer
 * whose part has a different count. Spline questions always offer 20, 24 and Not sure (plus any other count we stock).
 */
const COMMON_SPLINES = [20, 24];
function fixSplineOptions(q: Question): Question {
  if (q.attribute !== "splines" || q.kind !== "choice") return q;
  const counts = new Set(COMMON_SPLINES);
  for (const o of q.options ?? []) {
    const n = parseInt(o, 10);
    if ([18, 20, 24, 28].includes(n)) counts.add(n);
  }
  return { ...q, options: [...[...counts].sort((a, b) => a - b).map(String), "Not sure"] };
}
