"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Couldn't log in.");
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-lg font-bold text-brand">
          Part<span className="text-brand-accent">Match</span> <span className="font-medium text-slate-500">staff</span>
        </p>
        <label className="mt-6 block text-sm font-medium text-slate-700">
          Password
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="mt-1 block w-full rounded-lg border-0 px-3 py-2.5 ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-accent"
          />
        </label>
        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {busy ? "Checking…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
