/**
 * Hand-entered sample catalogue (plan section 6). Source of truth for supabase/seed.sql.
 *
 * Two kinds of entry:
 *  1. REAL products (have `source`): real model numbers with dimensions taken from public
 *     manufacturer/retailer listings (Nov 2026). These are the test-photo targets. Listings
 *     disagree a little, so values are "best published figure", not measured.
 *  2. SAMPLE own-brand filler (codes start "PM-"): fictional BSP/Ebaths items shaped like the real
 *     catalogue, mostly near-twins of the real ones so the clarifying questions have work to do.
 *
 * DISC018 follows the listing quoted in the build plan.
 * Prices and stock are fictional for every entry.
 */
import type { Category, ProductAttributes } from "@/lib/schemas";

export type CatalogueItem = {
  code: string;
  name: string;
  category: Category;
  brand: string;
  compatible_with?: string[];
  attributes: ProductAttributes;
  returnable?: boolean;
  restocking_fee?: boolean;
  description: string;
  price: number;
  stock: { qty: number; lead_days?: number | null; replacement?: string };
  /** Public listing the dimensions came from (real products only). */
  source?: string;
};

type DiscSpec = {
  size: '1/2"' | '3/4"';
  splines: number;
  spline_diameter_mm: number;
  length_mm: number;
  spline_length_mm?: number;
  closing: string;
  single_pair: "single" | "pair";
  thread?: string;
  turn?: string;
};

const disc = (
  code: string,
  brand: string,
  s: DiscSpec,
  price: number,
  stock: CatalogueItem["stock"],
  opts: { source?: string; note?: string } = {},
): CatalogueItem => {
  const a: ProductAttributes = { turn: "1/4", thread: "threaded collar", ...s };
  return {
    code,
    name: `${a.size} Ceramic Disc Cartridge${a.single_pair === "pair" ? "s (pair)" : ""} — ${a.splines} spline, ${a.length_mm}mm`,
    category: "ceramic_disc_cartridge",
    brand,
    attributes: a,
    description: [
      `${a.size} BSP ${a.turn} turn ceramic disc tap cartridge, ${a.splines} spline teeth, ${a.spline_diameter_mm}mm spline diameter`,
      `overall length ${a.length_mm}mm${a.spline_length_mm ? `, spline length ${a.spline_length_mm}mm` : ""}`,
      `closes ${a.closing}`,
      a.single_pair === "pair" ? "supplied as a hot and cold pair" : "single cartridge",
      opts.note,
    ]
      .filter(Boolean)
      .join(", ") + ".",
    price,
    stock,
    source: opts.source,
  };
};

const HOT_COLD = "anti-clockwise (hot) & clockwise (cold)";

export const CATALOGUE: CatalogueItem[] = [
  // ═════════════ Ceramic disc tap cartridges ═════════════
  // Real
  disc("DISC018", "Ebaths", { size: '1/2"', splines: 20, spline_diameter_mm: 8, length_mm: 57, closing: HOT_COLD, single_pair: "pair" }, 14.95, { qty: 42 },
    { note: "Measurements A57 B34 C23 D12" }),
  disc("DISC045", "Generic", { size: '1/2"', splines: 20, spline_diameter_mm: 7.6, length_mm: 48, closing: HOT_COLD, single_pair: "pair" }, 9.95, { qty: 30 },
    { source: "https://pipescenes.co.uk/shop/tap-spares/ceramic-disc-valves/1-2-tap-cartridges/20-spline-teeth/20-teeth-tap-cartridges-disc045-1-2-48mm-pair/" }),
  disc("TM-1220-53", "Tap Magician", { size: '1/2"', splines: 20, spline_diameter_mm: 7.6, length_mm: 53, spline_length_mm: 12, closing: HOT_COLD, single_pair: "pair" }, 11.5, { qty: 24 },
    { source: "https://www.amazon.co.uk/Replacement-Ceramic-Insert-Cartridge-Quarter/dp/B00QGIJZGU" }),
  disc("DV-1220-43C", "Generic", { size: '1/2"', splines: 20, spline_diameter_mm: 7.6, length_mm: 43, closing: "clockwise", single_pair: "single" }, 5.95, { qty: 0, lead_days: 4 },
    { source: "https://www.divapor.com/spares/bathrooms/tap-cartridges/ceramic-disc-tap-valve-cartridge-insert-1-2-bsp-quarter-turn-clockwise-close-43mm-height-20-teeth-spline-cold-side.php", note: "cold side, blue seal" }),
  disc("8367J", "Bristan", { size: '1/2"', splines: 24, spline_diameter_mm: 8, length_mm: 51.5, closing: HOT_COLD, single_pair: "pair", thread: "no threaded collar" }, 19.95, { qty: 8 },
    { source: "https://www.screwfix.com/p/bristan-1-2-bsp-quarter-turn-ceramic-tap-valves-pack/8367j" }),
  disc("DV-1224-51A", "Generic", { size: '1/2"', splines: 24, spline_diameter_mm: 8, length_mm: 51, closing: "anti-clockwise", single_pair: "single" }, 6.5, { qty: 12 },
    { source: "https://www.divapor.com/spares/bathrooms/tap-cartridges/ceramic-disc-tap-cartridge-valve-insert-1-2-bsp-quarter-turn-anti-clockwise-close-51mm-height-24-teeth-spline-hot-side.php", note: "hot side, red seal" }),
  disc("TC043", "Generic", { size: '1/2"', splines: 24, spline_diameter_mm: 8, length_mm: 47, closing: "anti-clockwise", single_pair: "single" }, 6.25, { qty: 0, lead_days: 5 },
    { source: "https://tap-cartridges.com/tc043/" }),
  disc("DV-3420-53", "Generic", { size: '3/4"', splines: 20, spline_diameter_mm: 7.65, length_mm: 53, spline_length_mm: 8, closing: HOT_COLD, single_pair: "pair" }, 12.95, { qty: 15 },
    { source: "https://www.divapor.com/spares/bathrooms/tap-cartridges/ceramic-disc-tap-valve-cartridge-insert-3-4-bsp-quarter-turn-anti-clockwise-close-53mm-height-20-teeth-spline-hot-side.php" }),
  disc("DISC012", "Generic", { size: '3/4"', splines: 20, spline_diameter_mm: 7.6, length_mm: 57, spline_length_mm: 12, closing: HOT_COLD, single_pair: "pair" }, 13.95, { qty: 0, lead_days: 3 },
    { source: "https://www.plumbsparesdirect.com/tap-repair/tap-glands/20-teeth-spline/34-bsp-ceramic-disc-tap-glands-20-teeth-disc012-a2", note: "long spline for bath fillers" }),
  // Sample own-brand twins
  disc("PM-CD-2053A", "BSP", { size: '1/2"', splines: 20, spline_diameter_mm: 7.6, length_mm: 53, closing: "anti-clockwise", single_pair: "single" }, 6.5, { qty: 18 }),
  disc("PM-CD-2053C", "BSP", { size: '1/2"', splines: 20, spline_diameter_mm: 7.6, length_mm: 53, closing: "clockwise", single_pair: "single" }, 6.5, { qty: 11 }),
  disc("PM-CD-2048H", "BSP", { size: '1/2"', splines: 20, spline_diameter_mm: 7.6, length_mm: 48, closing: "anti-clockwise", single_pair: "single", turn: "1/2" }, 7.25, { qty: 9 }),
  disc("PM-CD-2453P", "Ebaths", { size: '1/2"', splines: 24, spline_diameter_mm: 8, length_mm: 53, spline_length_mm: 12, closing: HOT_COLD, single_pair: "pair" }, 12.5, { qty: 0, lead_days: 4 }),
  disc("PM-CD-1840", "BSP", { size: '1/2"', splines: 18, spline_diameter_mm: 7.5, length_mm: 40, closing: "anti-clockwise", single_pair: "single" }, 6.25, { qty: 7 }),
  disc("PM-CD-2862", "BSP", { size: '3/4"', splines: 28, spline_diameter_mm: 9.5, length_mm: 62, closing: "anti-clockwise", single_pair: "single", turn: "1/2" }, 10.5, { qty: 4 }),
  disc("PM-CD-OLD47", "BSP", { size: '1/2"', splines: 20, spline_diameter_mm: 7.6, length_mm: 47, closing: "anti-clockwise", single_pair: "single" }, 5.5, { qty: 0, lead_days: null, replacement: "DISC045" },
    { note: "superseded design" }),

  // ═════════════ Mixer tap cartridges ═════════════
  {
    code: "SEDAL-35", name: "Sedal 35mm Mixer Tap Cartridge — flat base", category: "mixer_cartridge", brand: "Sedal",
    compatible_with: ["Kerox K35 equivalents", "single-lever basin and kitchen mixers"],
    attributes: { diameter_mm: 35, base_type: "flat", height_mm: 60.5, stem: "9 x 9mm", pin_spacing_mm: 18 },
    description: "Genuine Sedal 35mm ceramic disc single-lever mixer cartridge, flat base with two locating pins 18mm apart, overall height about 60mm, 9 x 9mm square stem.",
    price: 14.95, stock: { qty: 25 }, source: "https://hartplumbingspares.co.uk/product/sedal-35mm-tap-cartridge/",
  },
  {
    code: "SEDAL-40", name: "Sedal 40mm Mixer Tap Cartridge — flat base", category: "mixer_cartridge", brand: "Sedal",
    compatible_with: ["single-lever basin and kitchen mixers"],
    attributes: { diameter_mm: 40, base_type: "flat", height_mm: 70 },
    description: "Genuine Sedal 40mm ceramic disc single-lever mixer cartridge, flat base with two holes and rubber seals, overall height 70mm.",
    price: 16.95, stock: { qty: 16 }, source: "https://neshome.co.uk/products/sedal-basin-mono-tap-ceramic-disk-replacement-cartridge-40mm",
  },
  ...([
    ["PM-MX-35-56", 35, "flat", 56, 11.5, { qty: 10 }],
    ["PM-MX-35P", 35, "peg leg", 60, 11.95, { qty: 0, lead_days: 4 }],
    ["PM-MX-40P", 40, "peg leg", 70, 13.5, { qty: 8 }],
    ["PM-MX-40-64", 40, "flat", 64, 12.95, { qty: 6 }],
    ["PM-MX-25F", 25, "flat", 45, 10.25, { qty: 10 }],
    ["PM-MX-35OLD", 35, "flat", 58, 8.95, { qty: 0, lead_days: null, replacement: "SEDAL-35" }],
  ] as const).map(([code, dia, base, h, price, stock]): CatalogueItem => ({
    code,
    name: `${dia}mm Mixer Tap Cartridge — ${base} base`,
    category: "mixer_cartridge",
    brand: "BSP",
    attributes: { diameter_mm: dia, base_type: base, height_mm: h },
    description: `${dia}mm single-lever mixer tap cartridge with ${base} base, overall height ${h}mm.`,
    price,
    stock: { ...stock },
  })),

  // ═════════════ Thermostatic shower cartridges (non-returnable once opened) ═════════════
  {
    code: "1.1663.114", name: "Mira Atom / Coda Thermostatic Cartridge", category: "thermostatic_cartridge", brand: "Mira",
    compatible_with: ["Mira Atom", "Mira Coda"], attributes: { length_mm: 103.65, splines: 24, spline_tiers: 1 }, returnable: false,
    description: "Mira thermostatic cartridge assembly 1.1663.114 for Atom and Coda bar valves, length about 104mm, 24 tooth single-tier spline.",
    price: 64.95, stock: { qty: 4 }, source: "https://www.divapor.com/spares/showers/thermostatic-cartridge/mira-1663114-atom-and-coda-thermostatic-cartridge.php",
  },
  {
    code: "1.1663.152", name: "Mira Miniduo / Minilite Thermostatic Cartridge", category: "thermostatic_cartridge", brand: "Mira",
    compatible_with: ["Mira Miniduo", "Mira Minilite"], attributes: { length_mm: 102, thread_width_mm: 43.5 }, returnable: false,
    description: "Mira thermostatic cartridge 1.1663.152 for Miniduo and Minilite valves, length 102mm, 43.5mm brass thread.",
    price: 69.5, stock: { qty: 0, lead_days: 5 }, source: "https://www.divapor.com/spares/showers/thermostatic-cartridge/rada-mira-1663152-thermostatic-cartridge-for-miniduo-minilite-tabla-bijou-ordo-shower-mixer-valves-tmv3.php",
  },
  {
    code: "00622415", name: "Bristan Screw-in Thermostatic Cartridge", category: "thermostatic_cartridge", brand: "Bristan",
    compatible_with: ["Bristan Artisan bar showers"], attributes: { length_mm: 92, diameter_mm: 31.45, splines: 20, spindle_type: "screw-in" }, returnable: false,
    description: "Bristan screw-in thermostatic cartridge 00622415, length about 92mm, 31.45mm diameter.",
    price: 54.0, stock: { qty: 0, lead_days: null, replacement: "62000017" }, source: "https://www.divapor.com/spares/showers/thermostatic-cartridge/bristan-00622415-thermostatic-cartridge-screw-in.php",
  },
  {
    code: "62000017", name: "Bristan Thermostatic Shower Cartridge (plastic)", category: "thermostatic_cartridge", brand: "Bristan",
    compatible_with: ["Some Bristan Artisan bar showers"], attributes: { splines: 20, spindle_type: "splined" }, returnable: false,
    description: "Bristan replacement plastic thermostatic shower cartridge 62000017, 20 spline spindle.",
    price: 46.5, stock: { qty: 6 }, source: "https://www.plumbers-mate-sales.co.uk/bristan-thermostatic-shower--bath-mixer-cartridge---62000017-7355-p.asp",
  },
  {
    code: "9864J", name: "Bristan Push-in Thermostatic Bar Mixer Cartridge 95mm", category: "thermostatic_cartridge", brand: "Bristan",
    compatible_with: ["Most Bristan bar showers"], attributes: { length_mm: 95, splines: 20, spline_diameter_mm: 8, spindle_type: "push-in" }, returnable: false,
    description: "Brass push-in thermostatic bar mixer cartridge, 95mm overall, 8 x 6.7mm 20 tooth spline.",
    price: 39.95, stock: { qty: 9 }, source: "https://www.screwfix.com/p/bristan-thermostatic-bar-mixer-shower-cartridge-brass-95mm/9864j",
  },
  {
    code: "PM-TH-BSP1", name: "BSP Universal Bar Mixer Thermostatic Cartridge", category: "thermostatic_cartridge", brand: "BSP",
    compatible_with: ["Generic bar mixer shower valves"], attributes: { length_mm: 95, splines: 24, spindle_type: "push-in" }, returnable: false,
    description: "Own-brand push-in thermostatic cartridge for generic bar mixer showers, 95mm, 24 tooth spline.",
    price: 29.95, stock: { qty: 20 },
  },

  // ═════════════ Flush valves ═════════════
  {
    code: "PRO550UK", name: "Fluidmaster Dual Flush Valve — cable operated", category: "flush_valve", brand: "Fluidmaster",
    compatible_with: ["Concealed and close-coupled cisterns with remote button"],
    attributes: { height_mm: 210, button_type: "dual flush", operation: "cable", cable_mm: 350 },
    description: "Fluidmaster PRO550UK cable-operated dual flush valve with push button, 210mm high, 350mm cable, adjustable 3–6 litre flush.",
    price: 32.95, stock: { qty: 12 }, source: "https://plumbinbits.co.uk/product/fluidmaster-dual-flush-valve-pro550uk/",
  },
  {
    code: "PRO820UK", name: "Fluidmaster Dual Flush Valve — push rod", category: "flush_valve", brand: "Fluidmaster",
    compatible_with: ["Close-coupled cisterns with 40mm button hole"],
    attributes: { height_mm: 210, button_type: "dual flush", operation: "push", button_hole_mm: 40 },
    description: "Fluidmaster PRO820UK dual flush valve with rod-operated push button for a 40mm lid hole, 210mm high, rods cut to suit the cistern.",
    price: 27.5, stock: { qty: 30 }, source: "https://plumbinbits.co.uk/product/fluidmaster-dual-flush-valve-pro820uk/",
  },
  ...([
    ["PM-FV-P230", 230, "dual flush", "push", 21.95, { qty: 15 }],
    ["PM-FV-C260", 260, "dual flush", "cable", 29.95, { qty: 0, lead_days: 4 }],
    ["PM-FV-L240", 240, "single flush", "lever", 18.0, { qty: 4 }],
    ["PM-FV-P200", 200, "dual flush", "push", 19.95, { qty: 0, lead_days: 5 }],
    ["PM-FV-OLD", 200, "single flush", "push", 14.0, { qty: 0, lead_days: null, replacement: "PRO820UK" }],
  ] as const).map(([code, h, btn, op, price, stock]): CatalogueItem => ({
    code,
    name: `${btn === "single flush" ? "Single" : "Dual"} Flush Valve — ${op} operated, ${h}mm`,
    category: "flush_valve",
    brand: "BSP",
    attributes: { height_mm: h, button_type: btn, operation: op },
    description: `Own-brand ${btn} valve, ${h}mm tall, ${op} operated.`,
    price,
    stock: { ...stock },
  })),

  // ═════════════ Fill valves ═════════════
  {
    code: "400UK073", name: "Fluidmaster 400 Bottom Entry Fill Valve 1/2\" (plastic shank)", category: "fill_valve", brand: "Fluidmaster",
    attributes: { entry: "bottom", thread_size: '1/2"', shank: "plastic", height_mm: 260, height_range_mm: "230-355" },
    description: "Fluidmaster 400 bottom entry anti-siphon fill valve, 1/2in plastic shank, height adjustable 230–355mm.",
    price: 15.95, stock: { qty: 40 }, source: "https://www.fluidmasteruk.com/products/bottom-entry-fill-valve-1-2-plastic-shank/",
  },
  {
    code: "400LB074", name: "Fluidmaster 400 Bottom Entry Fill Valve 1/2\" (brass shank)", category: "fill_valve", brand: "Fluidmaster",
    attributes: { entry: "bottom", thread_size: '1/2"', shank: "brass", height_mm: 260, height_range_mm: "230-355" },
    description: "Fluidmaster 400 bottom entry anti-siphon fill valve, 1/2in brass shank, height adjustable 230–355mm.",
    price: 19.95, stock: { qty: 0, lead_days: 4 }, source: "https://www.fluidmasteruk.com/products/400-bottom-entry-fill-valve-1-2-brass-shank/",
  },
  {
    code: "30996007", name: "Siamp 99B Compact Bottom Entry Fill Valve 1/2\"", category: "fill_valve", brand: "Siamp",
    attributes: { entry: "bottom", thread_size: '1/2"', shank: "plastic", height_mm: 282 },
    description: "Siamp 99B compact bottom entry float valve, 1/2in BSP plastic thread, about 282mm tall, 0.5–10 bar.",
    price: 13.95, stock: { qty: 18 }, source: "https://plumbinbits.co.uk/product/siamp-1-2-bsp-99b-compact-bottom-inlet-float-valve-brass-thread-30996007/",
  },
  {
    code: "10120694", name: "Wirquin Jollyfill Air Side Entry Fill Valve 1/2\" (brass tail)", category: "fill_valve", brand: "Wirquin",
    attributes: { entry: "side", thread_size: '1/2"', shank: "brass", telescopic: true, height_range_mm: "250-390" },
    description: "Wirquin Jollyfill Air telescopic side feed inlet valve, 1/2in BSP brass tail, AUK1 air gap, adjustable 250–390mm.",
    price: 13.49, stock: { qty: 14 }, source: "https://plumbinbits.co.uk/product/wirquin-jollyfill-1-2-bsp-telescopic-side-feed-inlet-float-valve-brass-10120694/",
  },
  {
    code: "10120028", name: "Wirquin Jollyfill Telescopic Bottom Entry Fill Valve 1/2\"", category: "fill_valve", brand: "Wirquin",
    attributes: { entry: "bottom", thread_size: '1/2"', shank: "plastic", height_range_mm: "290-420", telescopic: true },
    description: "Wirquin Jollyfill telescopic bottom entry inlet valve, 1/2in plastic tailpiece, adjustable 290–420mm.",
    price: 13.5, stock: { qty: 0, lead_days: 5 }, source: "https://www.toiletspareparts.com/products/wirquin-jollyfill-1-2-plastic-telescopic-adjustable-bottom-entry-toilet-cistern-inlet-float-valve-10120028",
  },
  ...([
    ["PM-FL-S12", "side", '1/2"', 9.95, { qty: 22 }],
    ["PM-FL-B38", "bottom", '3/8"', 10.5, { qty: 10 }],
    ["PM-FL-S38", "side", '3/8"', 10.5, { qty: 0, lead_days: 4 }],
    ["PM-FL-OLD", "side", '1/2"', 8.95, { qty: 0, lead_days: null, replacement: "10120694" }],
  ] as const).map(([code, entry, thread, price, stock]): CatalogueItem => ({
    code,
    name: `${entry === "side" ? "Side" : "Bottom"} Entry Fill Valve ${thread}`,
    category: "fill_valve",
    brand: "BSP",
    attributes: { entry, thread_size: thread },
    description: `Own-brand ${entry} entry toilet cistern fill valve with ${thread} BSP inlet thread.`,
    price,
    stock: { ...stock },
  })),

  // ═════════════ Toilet seat hinges (no reliable published fixing centres found: all sample) ═════════════
  ...([
    ["PM-SH-TADJS", "top", "70-160", true, 16.95, { qty: 20 }],
    ["PM-SH-T155N", "top", "155", false, 11.5, { qty: 13 }],
    ["PM-SH-B155S", "bottom", "155", true, 15.95, { qty: 8 }],
    ["PM-SH-T165S", "top", "165", true, 16.95, { qty: 0, lead_days: 3 }],
    ["PM-SH-B140N", "bottom", "140", false, 9.95, { qty: 11 }],
    ["PM-SH-T178S", "top", "178", true, 18.5, { qty: 4 }],
    ["PM-SH-B165S", "bottom", "165", true, 15.95, { qty: 0, lead_days: 4 }],
    ["PM-SH-OLD", "bottom", "155", false, 7.95, { qty: 0, lead_days: null, replacement: "PM-SH-B155S" }],
  ] as const).map(([code, fixing, spacing, soft, price, stock]): CatalogueItem => ({
    code,
    name: `${fixing === "top" ? "Top" : "Bottom"} Fix ${soft ? "Soft Close " : ""}Seat Hinges — ${spacing}mm centres`,
    category: "seat_hinge",
    brand: "BSP",
    attributes: { fixing, hole_spacing_mm: spacing.includes("-") ? undefined : Number(spacing), hole_spacing_range_mm: spacing.includes("-") ? spacing : undefined, soft_close: soft },
    returnable: false,
    description: `${fixing}-fixing toilet seat hinge set${soft ? " with soft-close dampers" : ""}, for ${spacing}mm fixing-hole centres. Cannot be returned once the hinge pack is opened.`,
    price,
    stock: { ...stock },
  })),
];
