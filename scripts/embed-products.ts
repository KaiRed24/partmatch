/**
 * Embeds every product's description into products.embedding, then runs the Phase 1 check query.
 * Usage: npx tsx scripts/embed-products.ts
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY (or OPENAI_API_KEY with EMBEDDING_PROVIDER=openai) in .env.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { embed, embeddingProvider } from "../lib/embeddings";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export function productText(p: { name: string; brand: string | null; category: string; description: string | null; compatible_with: string[] | null }) {
  return [p.name, p.brand, p.category.replace(/_/g, " "), p.description, (p.compatible_with ?? []).join(", ")].filter(Boolean).join(". ");
}

async function main() {
  console.log(`Embedding provider: ${embeddingProvider()}`);
  const { data: products, error } = await supabase.from("products").select("id,name,brand,category,description,compatible_with");
  if (error) throw error;

  for (let i = 0; i < products.length; i += 50) {
    const batch = products.slice(i, i + 50);
    const vectors = await embed(batch.map(productText), "document");
    for (let j = 0; j < batch.length; j++) {
      const { error: upErr } = await supabase.from("products").update({ embedding: vectors[j] }).eq("id", batch[j].id);
      if (upErr) throw upErr;
    }
    console.log(`Embedded ${Math.min(i + 50, products.length)}/${products.length}`);
  }

  const query = '1/2 inch 20 spline anti-clockwise';
  const [qv] = await embed([query], "query");
  const { data: hits, error: mErr } = await supabase.rpc("match_products", {
    query_embedding: qv,
    filter_category: null,
    match_count: 5,
  });
  if (mErr) throw mErr;
  console.log(`\nCheck query: "${query}"`);
  for (const h of hits) console.log(`  ${h.similarity.toFixed(3)}  ${h.product_code}  ${h.name}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
