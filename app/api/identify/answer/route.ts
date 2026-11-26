import { NextResponse } from "next/server";
import { z } from "zod";
import { answer } from "@/lib/identify";
import { rateLimited } from "@/lib/images";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  identification_id: z.string().uuid(),
  answers: z.record(z.string(), z.union([z.string().max(100), z.number(), z.boolean()])),
});

/** POST JSON: { identification_id, answers: { attribute: value } } */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`answer:${ip}`, 20)) {
    return NextResponse.json({ error: "Too many tries in a minute. Please wait a moment and try again." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers." }, { status: 400 });

  try {
    const result = await answer({ db: supabaseAdmin(), identificationId: parsed.data.identification_id, answers: parsed.data.answers });
    const { extraction, ...publicResult } = result;
    return NextResponse.json({ ...publicResult, category: extraction.category });
  } catch (err) {
    console.error("answer failed", err);
    const notFound = err instanceof Error && err.message === "Identification not found";
    return NextResponse.json(
      { error: notFound ? "We couldn't find that search. Please start again." : "Something went wrong. Please try again." },
      { status: notFound ? 404 : 502 },
    );
  }
}
