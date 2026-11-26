"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import FittingTypePicker, { FITTING_OPTIONS } from "@/components/FittingTypePicker";
import HandoffForm from "@/components/HandoffForm";
import PhotoUpload from "@/components/PhotoUpload";
import QuestionCard from "@/components/QuestionCard";
import ResultCard from "@/components/ResultCard";
import type { Match } from "@/lib/identify";
import type { FittingType, Question } from "@/lib/schemas";

type ApiResult = {
  identification_id: string | null;
  status: "result" | "questions" | "handoff";
  confidence: number;
  round: number;
  matches: Match[];
  questions: Question[];
  photo_tip: string | null;
  category: string | null;
};

type Step =
  | { kind: "type" }
  | { kind: "photos" }
  | { kind: "loading" }
  | { kind: "questions" }
  | { kind: "result" }
  | { kind: "expert"; reason: "unsure" | "asked" | "enclosure" | "error" }
  | { kind: "sent"; reference: string; name: string }
  | { kind: "chosen"; match: Match }
  | { kind: "error"; message: string };

const LOADING_LINES = ["Reading markings and codes…", "Measuring proportions…", "Checking our catalogue…", "Comparing the closest matches…"];

function Loading() {
  const [i, setI] = useState(0);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LOADING_LINES.length), 2500);
    const s = setTimeout(() => setSlow(true), 20_000);
    return () => {
      clearInterval(t);
      clearTimeout(s);
    };
  }, []);
  return (
    <div className="flex flex-col items-center py-16 text-center" role="status" aria-live="polite">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-accent" aria-hidden />
      <p className="mt-6 font-semibold text-slate-900">{LOADING_LINES[i]}</p>
      <p className="mt-1 text-sm text-slate-500">
        {slow ? "Still working: it's busy right now, thanks for waiting." : "This usually takes 10–20 seconds."}
      </p>
    </div>
  );
}

export default function FindMyPart({ initialType }: { initialType: FittingType | null }) {
  const [fittingType, setFittingType] = useState<FittingType | null>(initialType);
  const [step, setStep] = useState<Step>(initialType ? { kind: "photos" } : { kind: "type" });
  const [photos, setPhotos] = useState<File[]>([]);
  const [result, setResult] = useState<ApiResult | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step.kind]);

  function show(r: ApiResult) {
    setResult(r);
    setStep(r.status === "questions" ? { kind: "questions" } : { kind: "result" });
  }

  async function call(url: string, init: RequestInit) {
    setStep({ kind: "loading" });
    try {
      const res = await fetch(url, init);
      // A server timeout comes back as plain text, not JSON: show a friendly message instead of a parsing error.
      const json = await res.json().catch(() => null);
      if (!json) {
        throw new Error(
          res.status === 504 || res.status === 502
            ? "Our photo matcher is very busy right now and took too long to answer. Please try again in a minute, or send your photos to our team instead."
            : "Something went wrong reading the reply. Please try again, or send your photos to our team instead.",
        );
      }
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      show(json as ApiResult);
    } catch (err) {
      setStep({ kind: "error", message: (err as Error).message });
    }
  }

  function identify(files: File[]) {
    setPhotos(files);
    if (fittingType === "shower_enclosure") {
      setStep({ kind: "expert", reason: "enclosure" });
      return;
    }
    const form = new FormData();
    if (fittingType) form.set("fitting_type", fittingType);
    files.forEach((f) => form.append("photos", f));
    call("/api/identify", { method: "POST", body: form });
  }

  function answer(answers: Record<string, string | number>) {
    if (!result?.identification_id) return;
    call("/api/identify/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identification_id: result.identification_id, answers }),
    });
  }

  function choose(m: Match) {
    if (result?.identification_id) {
      fetch("/api/identify/choose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identification_id: result.identification_id, product_code: m.product_code }),
      }).catch(() => {});
    }
    setStep({ kind: "chosen", match: m });
  }

  function restart() {
    setResult(null);
    setPhotos([]);
    setFittingType(null);
    setStep({ kind: "type" });
  }

  const typeLabel = FITTING_OPTIONS.find((o) => o.id === fittingType)?.label;
  const stepNo = step.kind === "type" ? 1 : step.kind === "photos" ? 2 : 3;

  return (
    <div>
      {["type", "photos", "loading", "questions"].includes(step.kind) && (
        <ol className="mb-6 flex gap-2" aria-label="Progress">
          {["Fitting", "Photos", "Match"].map((label, i) => (
            <li key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i < stepNo ? "bg-brand-accent" : "bg-slate-200"}`} />
              <p className={`mt-1 text-xs ${i < stepNo ? "font-medium text-slate-700" : "text-slate-400"}`}>{label}</p>
            </li>
          ))}
        </ol>
      )}

      {step.kind === "type" && (
        <section>
          <h1 className="text-2xl font-bold text-slate-900">Find your part from a photo</h1>
          <p className="mt-1 text-slate-600">Where did the part come from?</p>
          <div className="mt-5">
            <FittingTypePicker
              onPick={(t) => {
                setFittingType(t);
                setStep({ kind: "photos" });
              }}
            />
          </div>
        </section>
      )}

      {step.kind === "photos" && (
        <section>
          <button onClick={() => setStep({ kind: "type" })} className="text-sm font-medium text-brand">
            ← {typeLabel ? `${typeLabel} · change` : "Choose a fitting type"}
          </button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Add photos of the part</h1>
          {fittingType === "shower_enclosure" && (
            <p className="mt-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-200">
              Shower enclosure parts aren&apos;t in the instant matcher yet, so we&apos;ll send your photos straight to our team.
            </p>
          )}
          <div className="mt-5">
            <PhotoUpload fittingType={fittingType} onSubmit={identify} />
          </div>
        </section>
      )}

      {step.kind === "loading" && <Loading />}

      {step.kind === "questions" && result && (
        <QuestionCard
          key={result.round}
          questions={result.questions}
          category={result.category}
          round={result.round}
          onSubmit={answer}
          onExpert={() => setStep({ kind: "expert", reason: "asked" })}
        />
      )}

      {step.kind === "result" && result && (
        <div className="space-y-4">
          {result.photo_tip && (
            <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-200">
              <span className="font-semibold">Photo tip:</span> {result.photo_tip}
            </p>
          )}
          {result.matches.length ? (
            <ResultCard
              matches={result.matches}
              confidence={result.confidence}
              unsure={result.status === "handoff"}
              onChoose={choose}
              onExpert={() => setStep({ kind: "expert", reason: result.status === "handoff" ? "unsure" : "asked" })}
            />
          ) : (
            <HandoffForm
              identificationId={result.identification_id}
              fittingType={fittingType}
              photos={photos}
              intro="We couldn't find a close match in this demo catalogue. Our team can identify it from your photos."
              onDone={(reference, name) => setStep({ kind: "sent", reference, name })}
            />
          )}
          <button onClick={restart} className="w-full text-sm font-medium text-slate-500 underline underline-offset-2">
            Start again with a different part
          </button>
        </div>
      )}

      {step.kind === "expert" && (
        <HandoffForm
          identificationId={result?.identification_id ?? null}
          fittingType={fittingType}
          photos={photos}
          intro={
            step.reason === "enclosure"
              ? "Tell us where to reply and a specialist will identify your part from the photos."
              : step.reason === "unsure"
                ? "We narrowed it down but couldn't be certain. A specialist will check our shortlist against your photos."
                : "A specialist will check your photos and our suggestions, and email you the right part."
          }
          onDone={(reference, name) => setStep({ kind: "sent", reference, name })}
          onBack={result?.matches.length ? () => setStep({ kind: "result" }) : undefined}
        />
      )}

      {step.kind === "sent" && (
        <section className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Thanks, {step.name.split(" ")[0]}. It&apos;s with our team.</h2>
          <p className="mt-2 text-slate-600">
            Your reference is <span className="font-semibold text-slate-900">{step.reference}</span>. A specialist usually
            replies within one working day (Monday to Friday).
          </p>
          <button onClick={restart} className="mt-6 font-semibold text-brand underline underline-offset-2">
            Find another part
          </button>
        </section>
      )}

      {step.kind === "chosen" && (
        <section className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Great, that&apos;s your part</h2>
          <p className="mt-2 text-slate-600">
            {step.match.name} ({step.match.product_code}). In the live shop this would go straight into your basket.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/demo-shop" className="rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark">
              Back to the demo shop
            </Link>
            <button onClick={restart} className="font-semibold text-brand underline underline-offset-2">
              Find another part
            </button>
          </div>
        </section>
      )}

      {step.kind === "error" && (
        <section className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Sorry, that didn&apos;t work</h2>
          <p className="mt-2 text-slate-600">{step.message}</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => (photos.length ? identify(photos) : setStep({ kind: "photos" }))}
              className="rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark"
            >
              Try again
            </button>
            <button onClick={() => setStep({ kind: "expert", reason: "error" })} className="font-semibold text-brand underline underline-offset-2">
              Send my photos to the team instead
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
