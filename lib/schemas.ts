import { z } from "zod";

export const CATEGORIES = [
  "ceramic_disc_cartridge",
  "mixer_cartridge",
  "thermostatic_cartridge",
  "flush_valve",
  "fill_valve",
  "seat_hinge",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  ceramic_disc_cartridge: "Ceramic disc tap cartridge",
  mixer_cartridge: "Mixer tap cartridge",
  thermostatic_cartridge: "Thermostatic shower cartridge",
  flush_valve: "Flush valve",
  fill_valve: "Fill valve",
  seat_hinge: "Toilet seat hinge",
};

export const FITTING_TYPES = ["tap", "shower_valve", "toilet", "shower_enclosure"] as const;
export type FittingType = (typeof FITTING_TYPES)[number];

const nullableNum = z.number().nullable().optional();
const nullableStr = z.string().nullable().optional();

/** [1] Extraction output. Loose on attributes: models add extra keys, we keep them. */
export const ExtractionSchema = z.object({
  category: z.enum([...CATEGORIES, "unknown"]),
  visible_text: z.array(z.string()).default([]),
  brand_guess: nullableStr,
  attributes: z
    .object({
      size: nullableStr,
      splines: nullableNum,
      closing: nullableStr,
      estimated_length_mm: nullableNum,
      base_type: nullableStr,
      entry: nullableStr,
    })
    .passthrough()
    .default({}),
  ruler_visible: z.boolean().default(false),
  uncertain_about: z.array(z.string()).default([]),
  image_quality: z.enum(["good", "poor"]).default("good"),
  photo_tip: nullableStr,
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.enum(["choice", "number_mm"]),
  options: z.array(z.string()).optional(),
  attribute: z.string().optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

/** [3] Rerank output. */
export const RerankSchema = z.object({
  ranked: z
    .array(z.object({ product_code: z.string(), score: z.number().min(0).max(1), reason: z.string() }))
    .max(8),
  confidence: z.number().min(0).max(1),
  questions: z.array(QuestionSchema).max(3).default([]),
});
export type Rerank = z.infer<typeof RerankSchema>;

/** Product attribute shapes per category (stored in products.attributes jsonb). */
export type ProductAttributes = {
  size?: string;
  splines?: number;
  spline_diameter_mm?: number;
  a_mm?: number;
  b_mm?: number;
  c_mm?: number;
  d_mm?: number;
  length_mm?: number;
  turn?: string;
  closing?: string;
  single_pair?: string;
  thread?: string;
  diameter_mm?: number;
  base_type?: string;
  height_mm?: number;
  spindle_type?: string;
  button_type?: string;
  operation?: string;
  entry?: string;
  thread_size?: string;
  fixing?: string;
  hole_spacing_mm?: number;
  soft_close?: boolean;
  [key: string]: unknown;
};
