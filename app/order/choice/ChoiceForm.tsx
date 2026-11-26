"use client";
import { useState } from "react";

type Choice = "wait" | "part_ship" | "refund";

export const OPTIONS: { key: Choice; label: string; help: string; done: string }[] = [
  {
    key: "wait",
    label: "Wait for it",
    help: "Keep your order as it is. We'll send everything together when the part arrives.",
    done: "We'll hold your order and send it as soon as the part arrives.",
  },
  {
    key: "part_ship",
    label: "Send what's ready",
    help: "We send anything in stock now, and this part separately when it arrives.",
    done: "We'll send what's in stock now and this part as soon as it arrives.",
  },
  {
    key: "refund",
    label: "Refund this item",
    help: "We cancel this item and refund it to your original payment method.",
    done: "We'll cancel this item and refund it to your original payment method, usually within 3–5 working days.",
  },
];

export default function ChoiceForm({ token, preselected, current }: { token: string; preselected: Choice | null; current: Choice | null }) {
  const [choice, setChoice] = useState<Choice | null>(preselected ?? current);
  const [saved, setSaved] = useState<Choice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!choice) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, choice }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      setSaved(choice);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    const o = OPTIONS.find((x) => x.key === saved)!;
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Thanks, that&apos;s noted</h2>
        <p className="mt-2 text-slate-600">{o.done}</p>
        {saved !== "refund" && (
          <button onClick={() => setSaved(null)} className="mt-4 text-sm font-medium text-brand underline underline-offset-2">
            Change my answer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-semibold text-slate-900">What would you like us to do?</p>
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          onClick={() => setChoice(o.key)}
          aria-pressed={choice === o.key}
          className={`block w-full rounded-xl p-4 text-left ring-1 transition ${
            choice === o.key ? "bg-brand/5 ring-2 ring-brand" : "bg-white ring-slate-200 hover:ring-brand-accent"
          }`}
        >
          <span className="flex items-center gap-3">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2 ${choice === o.key ? "ring-brand" : "ring-slate-300"}`}
              aria-hidden
            >
              {choice === o.key && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
            </span>
            <span>
              <span className="block font-semibold text-slate-900">{o.label}</span>
              <span className="block text-sm text-slate-600">{o.help}</span>
            </span>
          </span>
        </button>
      ))}
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <button
        onClick={confirm}
        disabled={!choice || busy}
        className="w-full rounded-xl bg-brand py-3.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {busy ? "Saving…" : "Confirm my choice"}
      </button>
      {current && (
        <p className="text-center text-xs text-slate-500">
          You previously chose &ldquo;{OPTIONS.find((o) => o.key === current)?.label}&rdquo;. You can change it here.
        </p>
      )}
    </div>
  );
}
