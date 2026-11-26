import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Part<span className="text-sky-300">Match</span>
        </Link>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">Prototype · demo data</span>
      </div>
    </header>
  );
}
