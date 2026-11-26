/**
 * Runs every photo in test-images/expected.json through the identification pipeline and prints top-1 / top-3 accuracy:
 *  - "Photo only": the first pass, before any questions.
 *  - "After questions": when the app asks questions, a simulated customer answers them truthfully from the real
 *    part's catalogue attributes (what a customer holding the part could count or measure), up to 2 rounds.
 * Nothing is saved to the database. Each result line prints as soon as that photo finishes.
 * Usage: npm run eval            (all photos)
 *        npm run eval -- 05 12   (only files whose name contains "05" or "12")
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { ImageInput } from "../lib/ai";
import { identify, refineInMemory, MAX_ROUNDS, type IdentifyResult } from "../lib/identify";
import type { Question } from "../lib/schemas";
import { sniffImage } from "../lib/images";
import { CATALOGUE } from "../data/catalogue";
import type { FittingType } from "../lib/schemas";

type Expected = { file: string; expected: string; handoff_ok?: boolean; notes?: string };

const dir = join(__dirname, "..", "test-images");
const { photos } = JSON.parse(readFileSync(join(dir, "expected.json"), "utf8")) as { photos: Expected[] };
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const FITTING_OF: Record<string, FittingType> = {
  ceramic_disc_cartridge: "tap",
  mixer_cartridge: "tap",
  thermostatic_cartridge: "shower_valve",
  flush_valve: "toilet",
  fill_valve: "toilet",
  seat_hinge: "toilet",
};
// Free tier allows ~10 requests a minute and each photo makes 2, so pace the run.
const GAP_MS = Number(process.env.EVAL_GAP_MS ?? 13_000);

/** A truthful customer: answers from the real part's attributes, "Not sure" for anything they can't check. */
function simulatedAnswers(questions: Question[], attrs: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const q of questions) {
    if (!q.attribute) continue;
    const v = attrs[q.attribute];
    if (v == null || String(v).includes("&")) {
      out[q.attribute] = "Not sure";
    } else if (q.kind === "number_mm") {
      out[q.attribute] = Number(v);
    } else {
      const want = String(v).toLowerCase().replace(/[^a-z0-9/]/g, "");
      const opt = (q.options ?? []).find((o) => {
        const t = o.toLowerCase().replace(/[^a-z0-9/]/g, "");
        return t === want || t.startsWith(want) || (want.length >= 2 && t.includes(want));
      });
      out[q.attribute] = opt ? String(v) : "Not sure";
    }
  }
  return out;
}

async function main() {
  const filters = process.argv.slice(2);
  const run = filters.length ? photos.filter((p) => filters.some((f) => p.file.includes(f))) : photos;
  const tally = { first1: 0, first3: 0, final1: 0, final3: 0, asked: 0, handoff: 0 };

  for (const [i, p] of run.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
    const buf = readFileSync(join(dir, p.file));
    const mediaType = sniffImage(buf);
    if (!mediaType) throw new Error(`${p.file} is not a JPEG/PNG/WebP`);
    const images: ImageInput[] = [{ mediaType, base64: buf.toString("base64") }];
    const real = CATALOGUE.find((c) => c.code === p.expected);
    const fittingType = real ? FITTING_OF[real.category] : null;

    const t0 = Date.now();
    try {
      const first = await identify({ db, images, fittingType, persist: false });
      let r: IdentifyResult = first;
      const answers: Record<string, string | number> = {};
      const asked: string[] = [];
      while (r.status === "questions" && r.round < MAX_ROUNDS) {
        Object.assign(answers, simulatedAnswers(r.questions, (real?.attributes ?? {}) as Record<string, unknown>));
        asked.push(...r.questions.map((q) => `${q.text} → ${q.attribute ? answers[q.attribute] : "(no attribute)"}`));
        await new Promise((res) => setTimeout(res, GAP_MS / 2));
        r = await refineInMemory({ db, images, extraction: first.extraction, answers, fittingType, round: r.round + 1 });
      }

      const codesOf = (x: IdentifyResult) => x.matches.map((m) => m.product_code);
      const ok = (x: IdentifyResult, n: number) =>
        codesOf(x).slice(0, n).includes(p.expected) || Boolean(p.handoff_ok && x.status !== "result");
      if (ok(first, 1)) tally.first1++;
      if (ok(first, 3)) tally.first3++;
      if (ok(r, 1)) tally.final1++;
      if (ok(r, 3)) tally.final3++;
      if (first.status !== "result") tally.asked++;
      if (r.status === "handoff") tally.handoff++;

      const mark = (x: IdentifyResult) => (ok(x, 1) ? "✅" : ok(x, 3) ? "🟡" : "❌");
      console.log(
        `${mark(first)}→${mark(r)} ${p.file.padEnd(26)} want ${p.expected.padEnd(11)} ` +
          `photo: ${codesOf(first).join(", ").padEnd(38)} final: ${codesOf(r).join(", ").padEnd(38)} ` +
          `${r.status} conf ${r.confidence.toFixed(2)} (${((Date.now() - t0) / 1000).toFixed(0)}s)`,
      );
      if (process.env.EVAL_VERBOSE) {
        const ex = first.extraction;
        console.log("     read:", JSON.stringify({ cat: ex.category, text: ex.visible_text, brand: ex.brand_guess, attrs: ex.attributes, q: ex.image_quality }));
        for (const a of asked) console.log("     asked:", a);
      }
    } catch (err) {
      console.log(`❌ ${p.file.padEnd(26)} ERROR ${(err as Error).message.slice(0, 200)}`);
    }
  }

  const n = run.length;
  const pct = (x: number) => `${x}/${n} (${Math.round((x / n) * 100)}%)`;
  console.log(`
Photo only:       top-1 ${pct(tally.first1)}   top-3 ${pct(tally.first3)}`);
  console.log(`After questions:  top-1 ${pct(tally.final1)}   top-3 ${pct(tally.final3)}`);
  console.log(`Asked questions: ${tally.asked}/${n}   Ended in expert handoff: ${tally.handoff}/${n}`);
  console.log(`Target top-3 ≥ 80%: photo only ${tally.first3 / n >= 0.8 ? "PASS" : "not yet"}, after questions ${tally.final3 / n >= 0.8 ? "PASS" : "not yet"}`);
  console.log("(left mark = photo only, right mark = after questions. ✅ top pick right  🟡 in top 3  ❌ missed. The blurry photo also passes if it asks or hands off.)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
