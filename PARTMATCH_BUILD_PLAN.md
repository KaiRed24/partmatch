# PartMatch — Final Build Plan

**An instant, 24/7 version of Bathroom Spare Parts' "Free part matching service".**
Customer snaps a photo → AI identifies the part using the same measurements BSP's team asks for → shows the match with honest stock/despatch info → if unsure, hands a fully pre-filled enquiry to the team.

Job-application prototype for the *AI Automation & Development Specialist* role at Bathroom Spare Parts (Venezia Marketing & Distribution), Hoddesdon.

> **For Claude Code:** This file is the source of truth. Work phase by phase (section 9), check each phase's "done when" before moving on, keep commits small, and ask before adding anything out of scope. Never scrape or call bathroomspareparts.co.uk systems. Sample data is entered by hand (section 6).

---

## 1. What we learned from their website (Nov 2026)

**How part identification works today (manual):**
- Product pages advertise a **"Free part matching service"**.
- Contact page: customers email photos to sales@bathroomspareparts.co.uk or use WhatsApp. They say they'll **reply within one working day** and can "usually name it first time" from photos.
- Phone lines: **Mon–Fri 08:00–16:00 (Wed from 09:00), closed weekends.**
- They publish photo checklists per fitting type:
  - **Taps:** brand and range, a photo of the tap, the cartridge and its measurements
  - **Shower valves:** valve body with handles and chrome removed, markings, cartridge sizes
  - **Toilets and seats:** cistern internals, flush button, the part, key measurements
  - **Shower enclosures:** the whole enclosure, the roller/hinge/seal/handle, markings
- The contact form has an enquiry type called **"Part identification"**.

**Why a wrong identification is costly (from their returns policy):**
- **Opened thermostatic cartridges cannot be returned.**
- Toilet seats can't be returned once the hinge pack is opened.
- **A 20% restocking charge** applies to some returns, and the customer pays return postage.
- Wrong-item claims need photos of the item and label within 48 hours.

→ Getting it right *before* the customer orders saves them money and saves staff time.

**Their product data structure** (for example, tap cartridge DISC018):
`MPN, Splines (e.g. 20), Spline Diameter (8mm), Measurement A/B/C/D (57/34/23/12), Length (57mm), Single/Pair, Thread (Threaded Collar), Closing (Clockwise / Anti-Clockwise), Brand, Product Code`

**Catalogue structure:**
- About **448 brands**, organised as Brand → part type (e.g. "Bristan Tap Spares", "Geberit Flush Valves").
- Generic part types include:
  - **Ceramic disc cartridges:** 1/2" and 3/4", 1/4 turn and 1/2 turn, plus bespoke made-to-measure
  - **Mixer cartridges:** flat base, peg leg, discontinued
  - **Shower cartridges:** thermostatic, diverter, flow/shut-off
  - Flush valves, fill valves, buttons/plates, syphons (Fluidmaster, Geberit, Wirquin/Macdee, Siamp)
  - Toilet seats and hinges, shower door rollers/seals/handles, wastes and traps
- Popular brands: Armitage Shanks, Ideal Standard, Bristan, Grohe, Hansgrohe, Mira, Aqualisa, Geberit, Fluidmaster, Burlington, Crosswater, Duravit, Villeroy & Boch, Wirquin. Own brands: **BSP** and **Ebaths**.

**Delivery and stock rules:**
- Same-day despatch if ordered **by 12:30pm Mon–Fri**. UK delivery takes 1–3 working days.
- Delivery costs **£4.50 or £6.50**, free over £150 (£100 during Black Friday).
- If an item is out of stock, they email the customer three options: **wait, part-ship, or refund**. (We automate this.)
- International orders: 2kg / 30cm parcel limit. Import duty is charged separately on arrival.

**Branding:**
- Font: **DM Sans**.
- Sample their main colour and logo style from the site by eye and match it on the mock page. Don't copy their logo file; use a text wordmark.

**Reputation:**
- Their homepage says they're rated on Trustpilot from **32,000+ reviews**. Overall reputation is strong.
- The complaints that do appear (wrong part received, stock showing "in stock" when it isn't) match exactly what this tool targets.
- **Framing for the pitch: "scale your team's expertise", never "fix your problems".**

---

## 2. The pitch in one paragraph

Your team is brilliant at identifying parts from photos, but it happens by email, takes up to a working day, and stops when the phones close at 4pm. PartMatch gives customers an instant answer at 9pm on a Sunday. It uses the same checklist and measurements your team already asks for, shows honest despatch information, and when it isn't sure, sends your team a complete enquiry with photos, measurements and the AI's best guesses. That means fewer back-and-forth emails, fewer wrong orders, and fewer non-returnable mistakes.

---

## 3. Scope

### MVP (build this)
1. **Find My Part flow:**
   - The customer picks a fitting type (Tap / Shower valve / Toilet / Shower enclosure) or skips it.
   - They upload 1–3 photos.
   - The AI extracts attributes, then asks guided measurement questions in BSP's own terms (splines, A/B/C/D, closing direction).
   - It returns the top match plus 2 alternatives, each with a confidence score and "why".
2. **Honest availability on the result:**
   - "In stock — order by 12:30pm for same-day despatch"
   - "Supplier item — usually X working days"
   - "Discontinued — compatible alternative: Y"
   - Warnings where they apply, e.g. *"Thermostatic cartridges can't be returned once opened, so please confirm your measurements."*
3. **Hand off to an expert:**
   - When confidence is low or the customer is unsure, the tool creates a "Part identification" ticket.
   - The ticket carries the photos, answers, extracted attributes and the AI's top candidates, so staff confirm rather than start from scratch.
4. **Out-of-stock / delay automation:**
   - Staff mark an order delayed.
   - The customer automatically gets an email with the new ETA and three buttons: **Wait / Part-ship / Refund**, matching their existing policy.
   - The choice is logged.
5. **Staff dashboard:** handoff queue (with the AI's suggestions), identification log, orders, delay trigger, simple stats.
6. **Mock product page** in BSP's style with a "Not sure? Find my part from a photo" button.

### Out of scope (goes in the roadmap)
- Live stock/ERP integration
- WhatsApp channel
- Wrong-item claim checker (compare a photo of the received item with the order)
- Warehouse picking checks
- Customs paperwork
- Phone bot

### Pilot categories (keep it tight; do these well)
| Category | Key attributes |
|---|---|
| Ceramic disc tap cartridges | size (1/2" / 3/4"), splines, spline diameter, A/B/C/D, length, turn (1/4 / 1/2), closing, single/pair |
| Mixer tap cartridges | diameter, base type (flat / peg leg), height, spline count |
| Thermostatic shower cartridges | brand/valve compatibility, length, splines, spindle type |
| Flush valves | brand, height, button type, cable/push |
| Fill valves | side/bottom entry, thread size, brand |
| Toilet seat hinges | fixing type (top/bottom), hole spacing, soft-close |

---

## 4. Tech stack

| Layer | Choice |
|---|---|
| App + API | Next.js 14 (App Router), TypeScript, Tailwind, DM Sans |
| Database | Supabase Postgres + pgvector |
| Storage | Supabase Storage (private bucket, signed URLs) |
| AI | Vision-capable model (OpenAI or Anthropic), set by env var; embeddings model for search |
| Validation | zod for every AI response |
| Automation | n8n webhook → email (fallback: Resend from an API route) |
| Hosting | Vercel |

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER=openai            # or anthropic
AI_VISION_MODEL=
AI_EMBEDDING_MODEL=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
N8N_DELAY_WEBHOOK_URL=
RESEND_API_KEY=
ADMIN_PASSWORD=
CONFIDENCE_THRESHOLD=0.75
DESPATCH_CUTOFF=12:30
```

---

## 5. Data model

```sql
create extension if not exists vector;

create table products (
  id uuid primary key default gen_random_uuid(),
  product_code text unique not null,
  name text not null,
  category text not null,          -- ceramic_disc_cartridge | mixer_cartridge | thermostatic_cartridge | flush_valve | fill_valve | seat_hinge
  brand text,                      -- Bristan, Armitage Shanks, Ebaths, BSP, Fluidmaster...
  compatible_with text[],          -- tap/valve ranges
  attributes jsonb not null default '{}',
    -- cartridges: {size, splines, spline_diameter_mm, a_mm, b_mm, c_mm, d_mm, length_mm, turn, closing, single_pair, thread}
  returnable boolean default true, -- false for thermostatic cartridges once opened
  restocking_fee boolean default false,
  description text,
  price_gbp numeric(8,2),          -- fictional
  embedding vector(1536)
);

create table stock (
  product_id uuid primary key references products(id),
  qty_on_hand int not null default 0,
  supplier_lead_days int,          -- null + qty 0 = discontinued
  replacement_product_id uuid references products(id),
  updated_at timestamptz default now()
);

create table identifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  fitting_type text,
  image_paths text[],
  extracted jsonb,
  answers jsonb,
  candidates jsonb,
  chosen_product_id uuid references products(id),
  confidence numeric,
  handed_off boolean default false
);

create table tickets (                -- mirrors their "Part identification" enquiry type
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  identification_id uuid references identifications(id),
  customer_name text,
  customer_email text,
  notes text,
  status text default 'open',         -- open | resolved
  resolved_product_id uuid references products(id)  -- staff answer = future training signal
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text unique,              -- fictional, e.g. BSP-100234
  customer_name text,                 -- fictional
  customer_email text,                -- your own inbox for demo
  product_id uuid references products(id),
  status text default 'processing',   -- processing | delayed | dispatched | part_shipped | refunded
  promised_date date,
  revised_date date,
  customer_choice text,               -- wait | part_ship | refund
  choice_token text,                  -- signed token for email buttons
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  type text,
  sent_at timestamptz default now(),
  payload jsonb
);
```

Add a SQL function `match_products(query_embedding, category, limit)` for vector search with an optional category filter.

---

## 6. Sample data

- **50–80 products** across the 6 pilot categories, **typed in by hand** into `supabase/seed.sql`. Don't scrape.
- Product names, codes, brands and attributes follow their public listings. That's public information, which the job ad allows.
  - Example: `DISC018 — 1/2" Ceramic Disc Cartridges, Ebaths, 20 splines, 8mm, A57 B34 C23 D12, length 57mm, pair, threaded collar, anti-clockwise & clockwise`.
- **Prices and stock levels are fictional.** Don't copy their product images; use placeholder icons per category.
- Include deliberately confusable pairs, e.g. the same cartridge in clockwise vs anti-clockwise close, or 20 vs 24 splines. These show off the clarifying questions.
- Stock mix: about 60% in stock, 30% supplier lead time, 10% discontinued with a replacement.
- 10–15 fictional orders, with your own email address on them.
- **Test photos:** 15–20 of your own photos of real cartridges, flush valves, fill valves and hinges. Include a ruler in some shots, and a few blurry or angled ones. Record the expected product code for each in `test-images/expected.json`.

---

## 7. AI pipeline

```
fitting type + photos
  → [1] extraction (JSON)
  → [2] retrieval (filters + vector)
  → [3] rerank + confidence
  → ≥ threshold → result
  → < threshold → [4] guided questions → [3] again (max 2 rounds) → handoff
```

### [1] Extraction prompt
```
You are a parts specialist at a UK bathroom spares supplier. Identify the part in these photos.
Return ONLY JSON:
{
  "category": "ceramic_disc_cartridge|mixer_cartridge|thermostatic_cartridge|flush_valve|fill_valve|seat_hinge|unknown",
  "visible_text": ["any markings, brand names or codes you can actually read"],
  "brand_guess": string|null,
  "attributes": {
    "size": "1/2\"|3/4\"|null", "splines": number|null, "closing": "clockwise|anti-clockwise|null",
    "estimated_length_mm": number|null, "base_type": string|null, "entry": "side|bottom|null", ...
  },
  "ruler_visible": boolean,
  "uncertain_about": ["attributes you could not determine"],
  "image_quality": "good|poor",
  "photo_tip": "if poor, one short tip in the style of: remove the chrome shroud / photograph the spline end-on / place a ruler beside it"
}
Never invent markings. If unsure, list the attribute in uncertain_about.
```

### [2] Retrieval
- Hard filter on category (unless unknown).
- Exact match boost: `visible_text` against product code, MPN and brand.
- Numeric closeness: splines exact, length ±2mm, A/B/C/D ±1.5mm.
- Vector similarity on the description.
- Take the top 8.

### [3] Rerank prompt
```
Match the customer's part to the catalogue.
Inputs: extracted attributes, customer answers, up to 8 candidates with attributes.
Return JSON:
{ "ranked": [{"product_code","score":0-1,"reason"}],
  "confidence": 0-1,
  "questions": [up to 3 questions that best separate the top candidates] }
Questions must use the supplier's own measurement terms and be answerable by a non-expert holding the part, e.g.
"Count the teeth (splines) on the spindle — 20 or 24?", "Measure overall length (A) in mm",
"Which way does the tap turn to close — clockwise or anti-clockwise?"
Only ask questions if confidence < {{THRESHOLD}}.
```

### [4] Guided questions UI
- Tappable options where possible (20 / 24 / Not sure).
- Number inputs for mm, with a small diagram showing A/B/C/D for cartridges. Draw a simple SVG of your own.
- After 2 rounds, show: "Our team will confirm this for you", then the handoff.

### Result card
- Name, product code, brand, fictional price, category icon.
- **Stock badge** (section 8).
- "Why this matches": the matched attributes, ticked.
- **Returns warning** when `returnable=false`, e.g. "Thermostatic cartridges can't be returned once opened."
- The top 2 alternatives.
- Buttons: **"This is my part"** and **"Ask an expert to confirm"**.

---

## 8. Stock badge and delay automation

**Stock badge logic** (cutoff uses UK time):
- `qty > 0` and before 12:30 on a weekday → 🟢 "In stock — order in the next Xh Ym for same-day despatch"
- `qty > 0` otherwise → 🟢 "In stock — despatched next working day"
- `qty = 0` and lead time set → 🟠 "Supplier item — usually N working days"
- `qty = 0` and no lead time → 🔴 "Discontinued — compatible alternative: [replacement]"

**Delay flow** (automates their stated out-of-stock policy):
1. Staff click "Mark delayed" on an order and set the revised date.
2. The API updates the order, generates a `choice_token`, and POSTs to the n8n webhook.
3. n8n emails the customer: what's delayed, the new ETA, and **Wait / Part-ship / Refund** buttons linking to `/order/choice?token=…`. Optionally use an LLM step to keep the tone friendly.
4. The customer clicks a button → the order is updated → staff see the choice on the dashboard.
5. Export the workflow to `/n8n/delay-notification.json`.

---

## 9. Build phases

**Phase 0 — Setup (½ day)**
- [ ] Next.js scaffold, Tailwind, DM Sans, Supabase project, schema, pgvector, `lib/ai.ts` provider switch
- Done when: deployed to Vercel and connected to Supabase

**Phase 1 — Data (½ day)**
- [ ] Hand-entered seed data, embedding script, `match_products`
- Done when: a text query like "1/2 inch 20 spline anti-clockwise" returns the right cartridges

**Phase 2 — Identification core (1–1½ days)** ← the most important phase
- [ ] `/api/identify` and `/api/identify/answer`
- [ ] `scripts/eval-photos.ts` prints top-1 and top-3 accuracy against `expected.json`
- Done when: **top-3 accuracy is at least 80%** on your test photos. Don't move on until you get there; tune prompts and retrieval weights.

**Phase 3 — Customer UI (1 day)**
- [ ] `/find-my-part`: fitting type → upload (mobile camera, up to 3 photos, resize to max 1600px) → loading → questions → result
- [ ] Stock badge, returns warning, handoff form
- [ ] `/demo-shop`: mock BSP-style product page with the "Find my part" button
- Done when: the whole flow is smooth on a phone

**Phase 4 — Delay automation (½ day)**
- [ ] Mark delayed → n8n → email → choice page → order updated
- Done when: the email arrives in your inbox within a minute and the button click shows in the dashboard

**Phase 5 — Staff dashboard (½ day)**
- [ ] `/admin` behind a password: handoff queue with photos and AI suggestions, a "confirm part" action (sets `resolved_product_id`), identification log, orders, stats
- Done when: you can show the staff side end to end

**Phase 6 — Polish and submission (1 day)**
- [ ] Rate limiting, file type and size checks, keys kept server-side, friendly errors with photo tips
- [ ] README with an architecture diagram and screenshots
- [ ] Demo video and write-up

**Total: about 5 focused days.**

---

## 10. Folder structure
```
/app
  /find-my-part
  /demo-shop
  /order/choice
  /admin
  /api/identify
  /api/identify/answer
  /api/tickets
  /api/orders/[id]/delay
  /api/orders/choice
/components  FittingTypePicker, PhotoUpload, QuestionCard, CartridgeDiagram, ResultCard, StockBadge, ReturnsWarning
/lib         ai.ts, prompts.ts, schemas.ts, match.ts, stock.ts (cutoff logic), supabase.ts
/supabase    schema.sql, seed.sql
/scripts     embed-products.ts, eval-photos.ts
/n8n         delay-notification.json
/test-images expected.json + photos
```

---

## 11. Demo video (2–3 min)
1. **(15s)** "Your team identifies parts from emailed photos and replies within a working day. Here's that, instantly, at any hour."
2. **(45s)** On a phone: photograph a tap cartridge. It asks about spline count and closing direction, then shows the correct match with "order in the next 2h for same-day despatch".
3. **(20s)** A thermostatic cartridge shows the non-returnable warning, and the customer confirms their measurements.
4. **(20s)** A blurry photo gets low confidence and goes to an expert. Show the ticket arriving in the dashboard, pre-filled.
5. **(15s)** A discontinued part shows its compatible alternative.
6. **(30s)** Mark an order delayed. The email arrives, the customer clicks "Part-ship", and the dashboard updates.
7. **(15s)** "With access to your systems, here's what I'd do next."

---

## 12. Submission write-up

**The problem.** Your part-matching service is a real strength, but it runs on email, can take up to a working day, and stops when the phones close. When customers guess wrong, it costs both sides: return postage, restocking charges, and non-returnable items like opened thermostatic cartridges.

**What I built.** PartMatch identifies parts from photos using your own measurement system (splines, A–D measurements, closing direction), shows honest despatch timing, warns about non-returnable items, and hands low-confidence cases to your team fully pre-filled. It also automates your out-of-stock policy with one-click Wait / Part-ship / Refund emails.
Link: ___ · Video: ___

**How I built it.** Next.js, Supabase (Postgres + pgvector), [vision model] for identification and reasoning, embeddings for semantic search, n8n for automation, and Vercel for hosting. Built with Claude Code. Test set accuracy: top-1 __%, top-3 __%.

**What I'd do next with access to your systems.**
1. Connect to the live catalogue and stock so availability is always accurate.
2. Learn from your team: every expert-confirmed ticket becomes training data, so accuracy improves every week.
3. Add it to WhatsApp, which you already use for part help, and to every product page.
4. A wrong-item checker: compare the customer's photo of what arrived with the order, using your 48-hour claim process.
5. Scheduled stock checks against supplier feeds, to catch delays before customers have to chase.
6. Later: picking verification, customs paperwork automation, and email triage.

---

## 13. Rules
- Public information and fictional prices, stock, customers and orders only. No scraping. Don't access their internal systems.
- Don't copy their images or logo file.
- Don't quote or name individual reviewers.
- Keep the repo on your GitHub. Share the demo link and video, not the full source, unless asked.
