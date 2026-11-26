"use client";
import { useState } from "react";
import type { FittingType } from "@/lib/schemas";

export default function HandoffForm({
  identificationId,
  fittingType,
  photos,
  intro,
  onDone,
  onBack,
}: {
  identificationId: string | null;
  fittingType: FittingType | null;
  photos: File[];
  intro: string;
  onDone: (ref: string, name: string) => void;
  onBack?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const form = new FormData(e.currentTarget);
    if (identificationId) form.set("identification_id", identificationId);
    else {
      if (fittingType) form.set("fitting_type", fittingType);
      photos.forEach((p) => form.append("photos", p));
    }
    try {
      const res = await fetch("/api/tickets", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      onDone(json.reference, String(form.get("name")));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const field = "mt-1 block w-full rounded-lg border-0 px-3 py-2.5 text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-accent";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-accent">Free part matching service</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Ask our team to confirm</h2>
        <p className="mt-1 text-sm text-slate-600">{intro}</p>
      </div>
      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="block text-sm font-medium text-slate-700">
          Your name
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Anything else we should know? <span className="font-normal text-slate-500">(optional)</span>
          <textarea name="notes" rows={3} placeholder="e.g. tap brand, roughly how old it is, measurements" className={field} />
        </label>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button
          disabled={sending}
          className="w-full rounded-xl bg-brand py-3.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send to the team"}
        </button>
        <p className="text-xs text-slate-500">
          Your photos{identificationId ? ", answers and our best guesses" : ""} are attached automatically, so you won&apos;t
          need to send them again.
        </p>
      </div>
      {onBack && (
        <button type="button" onClick={onBack} className="w-full text-sm font-medium text-brand underline underline-offset-2">
          Back to the results
        </button>
      )}
    </form>
  );
}
