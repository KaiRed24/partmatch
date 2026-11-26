"use client";
import { useRef, useState } from "react";
import type { FittingType } from "@/lib/schemas";

const MAX_PHOTOS = 3;
const MAX_SIDE = 1600;

/** What a parts specialist would ask for, per fitting type. */
const CHECKLISTS: Record<FittingType | "any", string[]> = {
  tap: ["The cartridge out of the tap, side on", "The spline end, straight on, so the teeth are visible", "A ruler or tape beside it, if you have one"],
  shower_valve: ["The cartridge out of the valve, side on", "Any markings or numbers on the brass or plastic", "A ruler beside it, if you have one"],
  toilet: ["The part itself, out of the cistern if you can", "Where it connects (thread, cable, push rod)", "Any brand names or numbers on it"],
  shower_enclosure: ["The whole enclosure", "Close-up of the roller, hinge, seal or handle", "Any markings on the glass or frame"],
  any: ["The part on its own, side on", "Any markings, brand names or numbers", "A ruler beside it, if you have one"],
};

/** Shrink to max 1600px on the longest side and re-encode as JPEG. Keeps uploads small on mobile data. */
async function resize(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That file doesn't look like a photo we can read. Please try a JPEG or PNG.");
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't prepare that photo. Please try another.");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export default function PhotoUpload({
  fittingType,
  onSubmit,
}: {
  fittingType: FittingType | null;
  onSubmit: (photos: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setBusy(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      const picked = Array.from(list).slice(0, room);
      const ready = await Promise.all(picked.map(resize));
      setPhotos((p) => [...p, ...ready.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
      if (list.length > room) setError(`Up to ${MAX_PHOTOS} photos, so we kept the first ${room}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-slate-900">For the best match, photograph:</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {CHECKLISTS[fittingType ?? "any"].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-brand-accent" aria-hidden>✓</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <div key={p.url} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              onClick={() => setPhotos((all) => all.filter((x) => x !== p))}
              className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-sm font-bold text-slate-700 shadow"
              aria-label={`Remove photo ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-white text-sm font-medium text-slate-600 hover:border-brand-accent"
          >
            <span className="text-2xl leading-none" aria-hidden>+</span>
            {busy ? "Preparing…" : photos.length ? "Add another" : "Add photo"}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}

      <button
        onClick={() => onSubmit(photos.map((p) => p.file))}
        disabled={!photos.length || busy}
        className="mt-6 w-full rounded-xl bg-brand py-3.5 font-semibold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
      >
        Find my part
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Up to {MAX_PHOTOS} photos. Taken on a phone? You can use the camera directly.</p>
    </div>
  );
}
