"use client";
import { useState } from "react";
import type { Question } from "@/lib/schemas";
import CartridgeDiagram from "./CartridgeDiagram";

type Answers = Record<string, string | number>;

function diagramFor(q: Question): "A" | "B" | "C" | "D" | null {
  const m = q.text.match(/\(([ABCD])\)/);
  if (m) return m[1] as "A" | "B" | "C" | "D";
  if (q.attribute === "length_mm") return "A";
  if (q.attribute === "spline_length_mm") return "D";
  return null;
}

export default function QuestionCard({
  questions,
  category,
  round,
  onSubmit,
  onExpert,
}: {
  questions: Question[];
  category: string | null;
  round: number;
  onSubmit: (answers: Answers) => void;
  onExpert: () => void;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const key = (q: Question) => q.attribute || q.id;
  const set = (q: Question, v: string | number) => setAnswers((a) => ({ ...a, [key(q)]: v }));
  const allAnswered = questions.every((q) => answers[key(q)] !== undefined && answers[key(q)] !== "");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-accent">Nearly there{round > 0 ? ": one more check" : ""}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">A couple of quick checks</h2>
        <p className="mt-1 text-sm text-slate-600">
          A few parts look almost identical. These are the same checks our team would ask you to do.
        </p>
      </div>

      {questions.map((q) => {
        const diagram = category === "ceramic_disc_cartridge" && q.kind === "number_mm" ? diagramFor(q) : null;
        const value = answers[key(q)];
        return (
          <fieldset key={q.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <legend className="sr-only">{q.text}</legend>
            <p className="font-medium text-slate-900">{q.text}</p>
            {diagram && <CartridgeDiagram highlight={diagram} className="mx-auto mt-3 h-44" />}
            {q.kind === "choice" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {(q.options?.length ? q.options : ["Yes", "No", "Not sure"]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => set(q, o)}
                    aria-pressed={value === o}
                    className={`rounded-lg px-4 py-2.5 text-sm font-medium ring-1 transition ${
                      value === o ? "bg-brand text-white ring-brand" : "bg-white text-slate-700 ring-slate-300 hover:ring-brand-accent"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 48"
                  value={typeof value === "number" ? value : ""}
                  onChange={(e) => set(q, e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-32 rounded-lg border-0 px-3 py-2.5 text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-accent"
                  aria-label={q.text}
                />
                <span className="text-sm text-slate-500">mm</span>
                <button
                  type="button"
                  onClick={() => set(q, "Not sure")}
                  className={`ml-auto text-sm underline underline-offset-2 ${value === "Not sure" ? "font-semibold text-brand" : "text-slate-500"}`}
                >
                  Not sure
                </button>
              </div>
            )}
          </fieldset>
        );
      })}

      <button
        onClick={() => onSubmit(answers)}
        disabled={!allAnswered}
        className="w-full rounded-xl bg-brand py-3.5 font-semibold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        Check my answers
      </button>
      <button onClick={onExpert} className="w-full text-sm font-medium text-brand underline underline-offset-2">
        I&apos;d rather your team confirmed it
      </button>
    </div>
  );
}
