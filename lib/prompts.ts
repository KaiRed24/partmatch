/**
 * Prompts for the identification pipeline (plan section 7).
 * [1] extraction: read the photo into structured attributes.
 * [3] rerank: pick the best catalogue match and, if unsure, ask the customer simple questions.
 */
import { CATEGORY_LABELS, type Category, type FittingType } from "./schemas";

/** Which part categories each fitting type can contain. */
export const FITTING_CATEGORIES: Record<FittingType, Category[]> = {
  tap: ["ceramic_disc_cartridge", "mixer_cartridge"],
  shower_valve: ["thermostatic_cartridge", "mixer_cartridge"],
  toilet: ["flush_valve", "fill_valve", "seat_hinge"],
  shower_enclosure: [],
};

/** Attribute keys per category, matching products.attributes so extraction and catalogue line up. */
export const CATEGORY_ATTRIBUTES: Record<Category, string> = {
  ceramic_disc_cartridge:
    'size ("1/2\\"" or "3/4\\""), splines (count of teeth on the spindle: 18, 20, 24 or 28), length_mm (overall length A), spline_length_mm, turn ("1/4" or "1/2"), closing ("clockwise" or "anti-clockwise"), thread ("threaded collar" or "no threaded collar"), single_pair ("single" or "pair")',
  mixer_cartridge:
    'diameter_mm (body diameter, usually 25, 35 or 40), height_mm, base_type ("flat" = flat bottom face, which may have small locating pins or seal holes; "peg leg" = the body stands on separate legs/feet with a gap under it), stem (e.g. "9 x 9mm")',
  thermostatic_cartridge:
    'length_mm (overall), splines (on the temperature spindle), spindle_type ("splined", "screw-in" or "push-in"), diameter_mm',
  flush_valve:
    'operation ("cable", "push" or "lever"), button_type ("dual flush" or "single flush"), height_mm, button_hole_mm',
  fill_valve:
    'entry ("side" or "bottom"), thread_size ("1/2\\"" or "3/8\\""), shank ("plastic" or "brass"), height_mm, telescopic (true/false)',
  seat_hinge: 'fixing ("top" or "bottom"), hole_spacing_mm, soft_close (true/false)',
};

export const EXTRACTION_SYSTEM = `You are a parts specialist at a UK bathroom spares supplier. You identify replacement parts from customer photos.
You are careful: you never invent markings, and you say when you can't tell.`;

export function extractionPrompt(fittingType: FittingType | null): string {
  const cats = fittingType ? FITTING_CATEGORIES[fittingType] : [];
  const allowed = cats.length ? cats : (Object.keys(CATEGORY_LABELS) as Category[]);
  const attributeGuide = allowed.map((c) => `- ${c} (${CATEGORY_LABELS[c]}): ${CATEGORY_ATTRIBUTES[c]}`).join("\n");
  return `The customer says this part came from: ${fittingType ? fittingType.replace(/_/g, " ") : "not stated"}.
Identify the part in these photos.

Possible categories and the attributes to read for each:
${attributeGuide}

Return ONLY JSON:
{
  "category": ${[...allowed, "unknown"].map((c) => `"${c}"`).join(" | ")},
  "visible_text": ["any markings, brand names or codes you can actually read, exactly as printed"],
  "brand_guess": string | null,
  "attributes": { use the attribute keys listed above for that category; numbers are numbers in mm; null if you can't tell },
  "ruler_visible": boolean,
  "uncertain_about": ["attribute keys you could not determine"],
  "image_quality": "good" | "poor",
  "photo_tip": "if poor, one short tip, e.g. 'Photograph the spline end-on', 'Place a ruler beside it', 'Remove the chrome shroud first'"
}

Rules:
- Never invent markings. Only put text in visible_text if you can genuinely read it.
- Without a ruler, still estimate lengths from proportions, but add the key to uncertain_about.
- Count splines only if the spline end is clearly visible; otherwise null and list "splines" in uncertain_about.
- Size for disc cartridges: 3/4" bodies are chunkier, with a wider thread and hex than 1/2". Judge from proportions if you can.
- single_pair: leave null. Photos often show two of a part that is sold singly.
- "closing" can rarely be seen in a photo: leave it null unless it is marked (e.g. "C"/"AC", "HOT"/"COLD", arrows).
- If the photo is blurry, dark or too small to read detail, set image_quality to "poor".`;
}

export const RERANK_SYSTEM = `You are a senior parts specialist at a UK bathroom spares supplier. You match a customer's part to the catalogue.
You are honest about uncertainty: a wrong part costs the customer a return, so you only give high confidence when the evidence clearly separates the best match from the rest.`;

export function rerankPrompt(opts: {
  extraction: unknown;
  answers: Record<string, unknown>;
  candidates: unknown[];
  threshold: number;
  askQuestions: boolean;
}): string {
  return `Match the customer's part to the catalogue.

What we read from the photos:
${JSON.stringify(opts.extraction, null, 2)}

Customer's answers to earlier questions (trust these over the photo):
${Object.keys(opts.answers).length ? JSON.stringify(opts.answers, null, 2) : "none yet"}

Candidates (up to 8, with catalogue attributes):
${JSON.stringify(opts.candidates, null, 2)}

Look at the photos again and compare against each candidate's attributes, brand, code and description.
Readable codes or brand markings that match a candidate are strong evidence. Near-identical candidates that differ only in
something the photo can't show (length without a ruler, closing direction, spline count when hidden) are NOT separated by the photo.

Return ONLY JSON:
{
  "ranked": [{ "product_code": "...", "score": 0-1, "reason": "short, plain English" }],
  "confidence": 0-1,
  "questions": [{ "id": "short_id", "text": "...", "kind": "choice" | "number_mm", "options": ["..."], "attribute": "the attribute key it settles" }]
}

Rules:
- Rank every candidate you were given, best first, using only their product_code values.
- confidence = how sure you are the top one is the customer's exact part.
${
  opts.askQuestions
    ? `- If confidence < ${opts.threshold}, add up to 3 questions that best separate the top candidates. Otherwise "questions": [].
- Questions must use our own measurement terms and be answerable by a non-expert holding the part, e.g.
  "Count the teeth (splines) on the spindle: 20 or 24?", "Measure the overall length (A) in mm",
  "Which way does the tap turn to close: clockwise or anti-clockwise?"
- For "choice" questions give 2-4 options and always include "Not sure". For "number_mm" leave options out.
- Never ask about something the customer has already answered.
- Ask about what actually separates the top candidates. Values read from the photo are estimates: if the top candidates
  differ on spline count, ask the customer to count the splines even if the photo reading gave a number.
  Spline count and overall length (A) settle most disc cartridge cases; single/pair is rarely worth a question.`
    : `- Do not ask questions: "questions": [].`
}`;
}
