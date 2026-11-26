import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-accent">Prototype</p>
      <h1 className="mt-2 text-4xl font-bold text-brand">PartMatch</h1>
      <p className="mt-4 text-lg text-slate-600">
        Snap a photo of a worn bathroom part and get an instant match, using the same measurements a parts specialist
        would ask for. If it isn&apos;t sure, it hands a complete enquiry to the team.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/find-my-part" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
          Find my part
        </Link>
        <Link href="/demo-shop" className="rounded-lg border border-brand px-5 py-3 font-semibold text-brand">
          Demo product page
        </Link>
      </div>
    </main>
  );
}
