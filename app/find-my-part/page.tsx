import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { FITTING_TYPES, type FittingType } from "@/lib/schemas";
import FindMyPart from "./FindMyPart";

export const metadata: Metadata = { title: "Find my part · PartMatch" };

export default function Page({ searchParams }: { searchParams: { type?: string } }) {
  const t = searchParams.type;
  const initialType = t && (FITTING_TYPES as readonly string[]).includes(t) ? (t as FittingType) : null;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-6">
        <FindMyPart initialType={initialType} />
      </main>
    </>
  );
}
