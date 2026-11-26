"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Staff confirm the right part for a handoff. Quick-pick buttons for the AI's suggestions, or type any code. */
export function ResolveTicket({ ticketId, suggestions }: { ticketId: string; suggestions: string[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function resolve(productCode: string) {
    if (!productCode.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/tickets/${ticketId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_code: productCode.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json.error ?? "Couldn't save." });
    setMsg({ ok: true, text: `Confirmed: ${json.product}` });
    router.refresh();
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Confirm part</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {suggestions.map((c) => (
          <button
            key={c}
            disabled={busy}
            onClick={() => resolve(c)}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-brand hover:bg-brand hover:text-white disabled:opacity-50"
          >
            {c}
          </button>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resolve(code);
          }}
          className="flex gap-1"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Other code"
            className="w-28 rounded-lg border-0 px-2 py-1.5 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-accent"
            aria-label="Other product code"
          />
          <button disabled={busy || !code.trim()} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">
            Save
          </button>
        </form>
      </div>
      {msg && <p className={`mt-1.5 text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
    </div>
  );
}

/** "Mark delayed": set the new date and email the customer their Wait / Part-ship / Refund options. */
export function MarkDelayed({ orderRef, minDate }: { orderRef: string; minDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/orders/${orderRef}/delay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revised_date: f.get("revised_date"), reason: f.get("reason") || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json.error ?? "Couldn't update." });
    setMsg({
      ok: true,
      text: json.channel === "preview" ? "Marked delayed (email preview only: no email service set up)." : "Marked delayed and emailed the customer.",
    });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div>
        <button onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-800 ring-1 ring-amber-300 hover:bg-amber-50">
          Mark delayed
        </button>
        {msg && <p className={`mt-1 text-xs ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
      <label className="text-xs font-medium text-slate-700">
        New despatch date
        <input name="revised_date" type="date" required min={minDate} className="mt-1 block w-full rounded border-0 px-2 py-1.5 text-sm ring-1 ring-slate-300" />
      </label>
      <label className="text-xs font-medium text-slate-700">
        Reason (shown to the customer)
        <input name="reason" maxLength={300} placeholder="e.g. Supplier delay" className="mt-1 block w-full rounded border-0 px-2 py-1.5 text-sm ring-1 ring-slate-300" />
      </label>
      {msg && <p className="text-xs text-rose-700">{msg.text}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Sending…" : "Mark delayed & email"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-600 underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
