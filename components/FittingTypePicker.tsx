"use client";
import type { FittingType } from "@/lib/schemas";

export const FITTING_OPTIONS: { id: FittingType; label: string; hint: string; icon: JSX.Element }[] = [
  {
    id: "tap",
    label: "Tap",
    hint: "Tap cartridges, mixer cartridges",
    icon: <path d="M6 10h8V7a3 3 0 0 1 6 0v1h-2V7a1 1 0 0 0-2 0v3h2v3H6v-3Zm10 5h2v3a1 1 0 0 1-2 0v-3Z" />,
  },
  {
    id: "shower_valve",
    label: "Shower valve",
    hint: "Thermostatic cartridges",
    icon: <path d="M12 3a6 6 0 0 1 6 6H6a6 6 0 0 1 6-6Zm-5 8h2l-1 3H6l1-3Zm4 0h2v3h-2v-3Zm4 0h2l1 3h-2l-1-3ZM6 16h2l-1 3H5l1-3Zm5 0h2v3h-2v-3Zm5 0h2l1 3h-2l-1-3Z" />,
  },
  {
    id: "toilet",
    label: "Toilet",
    hint: "Flush valves, fill valves, seat hinges",
    icon: <path d="M6 3h8v7h4v2a6 6 0 0 1-4 5.6V21H8v-3.4A6 6 0 0 1 4 12v-2h2V3Zm2 2v5h4V5H8Z" />,
  },
  {
    id: "shower_enclosure",
    label: "Shower enclosure",
    hint: "Rollers, hinges, seals (our team)",
    icon: <path d="M4 3h16v18h-2V5h-5v16h-2V5H6v16H4V3Zm5 8h1v3H9v-3Zm5 0h1v3h-1v-3Z" />,
  },
];

export default function FittingTypePicker({ onPick }: { onPick: (t: FittingType | null) => void }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {FITTING_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className="flex flex-col items-start gap-2 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-2 hover:ring-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-brand" aria-hidden>
              {o.icon}
            </svg>
            <span className="font-semibold text-slate-900">{o.label}</span>
            <span className="text-xs text-slate-500">{o.hint}</span>
          </button>
        ))}
      </div>
      <button onClick={() => onPick(null)} className="mt-4 text-sm font-medium text-brand underline underline-offset-2">
        Not sure? Skip this step
      </button>
    </div>
  );
}
