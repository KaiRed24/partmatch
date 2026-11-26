import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { CATEGORY_LABELS, type Category } from "@/lib/schemas";
import { PHOTO_BUCKET, supabaseAdmin } from "@/lib/supabase";
import { MarkDelayed, ResolveTicket } from "./actions";

export const metadata: Metadata = { title: "Staff dashboard · PartMatch", robots: { index: false } };
export const dynamic = "force-dynamic";

type Candidate = { product_code: string; name: string; score?: number; reason?: string };
type Identification = {
  id: string;
  created_at: string;
  fitting_type: string | null;
  image_paths: string[] | null;
  extracted: { category?: string; visible_text?: string[]; brand_guess?: string | null; attributes?: Record<string, unknown>; image_quality?: string } | null;
  answers: Record<string, unknown> | null;
  candidates: Candidate[] | null;
  chosen_product_id: string | null;
  confidence: number | null;
  handed_off: boolean;
  rounds: number | null;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
const day = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }) : "–";
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");
const label = (s: string | null | undefined) => (s ? s.replace(/_/g, " ") : "–");

const STATUS_TONE: Record<string, string> = {
  processing: "bg-slate-100 text-slate-700",
  delayed: "bg-amber-100 text-amber-800",
  dispatched: "bg-emerald-100 text-emerald-800",
  part_shipped: "bg-sky-100 text-sky-800",
  refunded: "bg-rose-100 text-rose-800",
  open: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
};
const CHOICE_LABEL: Record<string, string> = { wait: "Wait", part_ship: "Send what's ready", refund: "Refund" };

function Pill({ value }: { value: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_TONE[value] ?? "bg-slate-100 text-slate-700"}`}>{label(value)}</span>;
}

function Stat({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default async function AdminPage() {
  if (!isAdmin()) redirect("/admin/login");
  const db = supabaseAdmin();
  const threshold = Number(process.env.CONFIDENCE_THRESHOLD || 0.75);

  const [{ data: tickets }, { data: idents }, { data: orders }, { data: products }, { data: notes }] = await Promise.all([
    db.from("tickets").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("identifications").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("orders").select("*").order("order_ref"),
    db.from("products").select("id,product_code,name"),
    db.from("notifications").select("order_id,type,payload,sent_at").order("sent_at", { ascending: false }).limit(200),
  ]);

  const productOf = new Map((products ?? []).map((p) => [p.id, p as { id: string; product_code: string; name: string }]));
  const identById = new Map(((idents ?? []) as Identification[]).map((i) => [i.id, i]));
  const ids = (idents ?? []) as Identification[];

  // Signed photo links (private bucket) for the tickets on screen.
  const ticketPhotos = (tickets ?? []).flatMap((t) => identById.get(t.identification_id)?.image_paths ?? []);
  const signed = ticketPhotos.length
    ? (await db.storage.from(PHOTO_BUCKET).createSignedUrls(ticketPhotos, 60 * 60)).data ?? []
    : [];
  const urlOf = new Map(signed.filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl as string]));

  // Stats
  const aiRuns = ids.filter((i) => i.extracted);
  const instant = aiRuns.filter((i) => (i.confidence ?? 0) >= threshold && !i.handed_off).length;
  const chosen = ids.filter((i) => i.chosen_product_id).length;
  const open = (tickets ?? []).filter((t) => t.status === "open");
  const resolved = (tickets ?? []).filter((t) => t.status === "resolved" && t.resolved_product_id);
  const aiTop3Right = resolved.filter((t) => {
    const code = productOf.get(t.resolved_product_id)?.product_code;
    return (identById.get(t.identification_id)?.candidates ?? []).slice(0, 3).some((c) => c.product_code === code);
  }).length;
  const delayed = (orders ?? []).filter((o) => o.revised_date);
  const awaiting = delayed.filter((o) => o.status === "delayed" && !o.customer_choice).length;
  const lastNoteFor = (orderId: string, type: string) => (notes ?? []).find((n) => n.order_id === orderId && n.type === type);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-brand text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <p className="text-lg font-bold">
            Part<span className="text-sky-300">Match</span> <span className="font-medium text-white/70">staff</span>
          </p>
          <nav className="hidden gap-5 text-sm font-medium sm:flex">
            <a href="#queue" className="hover:underline">Enquiries ({open.length})</a>
            <a href="#orders" className="hover:underline">Orders</a>
            <a href="#log" className="hover:underline">Identification log</a>
          </nav>
          <form action="/api/admin/logout" method="post">
            <button className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25">Log out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-6">
        <section aria-label="Stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat title="Photo searches" value={aiRuns.length} sub={`${instant} matched instantly (${pct(instant, aiRuns.length)})`} />
          <Stat title="Customer picked a match" value={chosen} sub={`${pct(chosen, aiRuns.length)} of searches`} />
          <Stat
            title="Expert enquiries"
            value={(tickets ?? []).length}
            sub={`${open.length} open · AI shortlist had the answer ${aiTop3Right}/${resolved.length}`}
          />
          <Stat title="Delayed orders" value={delayed.length} sub={`${awaiting} awaiting a customer choice`} />
        </section>

        <section id="queue" className="scroll-mt-20">
          <h2 className="text-lg font-bold text-slate-900">Part identification enquiries</h2>
          <p className="text-sm text-slate-500">Photos, answers and the AI&apos;s shortlist arrive pre-filled, so you confirm rather than start from scratch.</p>
          <div className="mt-4 space-y-4">
            {(tickets ?? []).length === 0 && <p className="rounded-xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-200">No enquiries yet.</p>}
            {(tickets ?? []).map((t) => {
              const ident = identById.get(t.identification_id);
              const ex = ident?.extracted;
              const resolvedTo = t.resolved_product_id ? productOf.get(t.resolved_product_id) : null;
              const attrs = Object.entries(ex?.attributes ?? {}).filter(([, v]) => v != null && v !== "");
              const answers = Object.entries(ident?.answers ?? {});
              return (
                <article key={t.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {t.customer_name} <span className="font-normal text-slate-500">· {t.customer_email}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        PM-{String(t.id).slice(0, 6).toUpperCase()} · {when(t.created_at)} · {label(ident?.fitting_type)}
                        {ex?.category ? ` · read as ${CATEGORY_LABELS[ex.category as Category] ?? label(ex.category)}` : ""}
                      </p>
                    </div>
                    <Pill value={t.status} />
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-[auto,1fr]">
                    <div className="flex gap-2">
                      {(ident?.image_paths ?? []).map((p) =>
                        urlOf.get(p) ? (
                          <a key={p} href={urlOf.get(p)} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={urlOf.get(p)} alt="Customer photo" className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200" />
                          </a>
                        ) : null,
                      )}
                      {!(ident?.image_paths ?? []).length && <p className="text-sm text-slate-400">No photos</p>}
                    </div>

                    <div className="space-y-2 text-sm">
                      {t.notes && <p className="rounded-lg bg-slate-50 p-2 text-slate-700">&ldquo;{t.notes}&rdquo;</p>}
                      {(ex?.visible_text?.length || attrs.length) ? (
                        <p className="text-slate-600">
                          <span className="font-medium text-slate-900">AI read: </span>
                          {[...(ex?.visible_text?.length ? [`markings "${ex.visible_text.join(", ")}"`] : []), ...attrs.map(([k, v]) => `${label(k)} ${v}`)].join(" · ")}
                          {ex?.image_quality === "poor" ? " · poor photo" : ""}
                        </p>
                      ) : null}
                      {answers.length > 0 && (
                        <p className="text-slate-600">
                          <span className="font-medium text-slate-900">Customer answered: </span>
                          {answers.map(([k, v]) => `${label(k)} ${v}`).join(" · ")}
                        </p>
                      )}
                      {(ident?.candidates ?? []).length > 0 && (
                        <div>
                          <p className="font-medium text-slate-900">
                            AI shortlist{ident?.confidence != null ? ` (confidence ${Math.round(ident.confidence * 100)}%)` : ""}
                          </p>
                          <ol className="mt-1 space-y-0.5 text-slate-600">
                            {(ident?.candidates ?? []).slice(0, 3).map((c, i) => (
                              <li key={c.product_code}>
                                {i + 1}. <span className="font-medium text-slate-800">{c.product_code}</span> {c.name}
                                {c.reason ? <span className="text-slate-400"> · {c.reason}</span> : null}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {resolvedTo ? (
                        <p className="font-medium text-emerald-700">
                          ✓ Confirmed: {resolvedTo.product_code} {resolvedTo.name}
                        </p>
                      ) : (
                        <ResolveTicket ticketId={t.id} suggestions={(ident?.candidates ?? []).slice(0, 3).map((c) => c.product_code)} />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="orders" className="scroll-mt-20">
          <h2 className="text-lg font-bold text-slate-900">Orders</h2>
          <p className="text-sm text-slate-500">
            Mark an order delayed to email the customer their options (wait, send what&apos;s ready, or refund). Their answer appears here.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Despatch by</th>
                  <th className="px-4 py-3">Customer choice</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(orders ?? []).map((o) => {
                  const product = productOf.get(o.product_id);
                  const email = lastNoteFor(o.id, "delay_email");
                  const choiceNote = lastNoteFor(o.id, "customer_choice");
                  const min = o.promised_date ?? new Date().toISOString().slice(0, 10);
                  const minNext = new Date(new Date(`${min}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
                  return (
                    <tr key={o.id} className="align-top">
                      <td className="px-4 py-3 font-medium text-slate-900">{o.order_ref}</td>
                      <td className="px-4 py-3 text-slate-700">{o.customer_name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="font-medium">{product?.product_code}</span>
                        <span className="block max-w-[220px] truncate text-xs text-slate-500">{product?.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Pill value={o.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {o.revised_date ? (
                          <>
                            <span className="text-slate-400 line-through">{day(o.promised_date)}</span> {day(o.revised_date)}
                          </>
                        ) : (
                          day(o.promised_date)
                        )}
                        {email && (
                          <span className="block text-xs text-slate-500">
                            Emailed {when(email.sent_at)}
                            {email.payload?.channel === "preview" ? " (preview only)" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {o.customer_choice ? (
                          <>
                            <span className="font-medium">{CHOICE_LABEL[o.customer_choice] ?? o.customer_choice}</span>
                            {choiceNote && <span className="block text-xs text-slate-500">{when(choiceNote.sent_at)}</span>}
                          </>
                        ) : o.status === "delayed" ? (
                          <span className="text-amber-700">Waiting for reply</span>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {["processing", "delayed"].includes(o.status) && <MarkDelayed orderRef={o.order_ref} minDate={minNext} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="log" className="scroll-mt-20">
          <h2 className="text-lg font-bold text-slate-900">Identification log</h2>
          <p className="text-sm text-slate-500">Every photo search: what the AI suggested, how sure it was, and what happened next.</p>
          <div className="mt-4 overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Fitting</th>
                  <th className="px-4 py-3">Top suggestion</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ids.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No searches yet.
                    </td>
                  </tr>
                )}
                {ids.slice(0, 50).map((i) => {
                  const top = (i.candidates ?? [])[0];
                  const chosenP = i.chosen_product_id ? productOf.get(i.chosen_product_id) : null;
                  const conf = i.confidence ?? 0;
                  return (
                    <tr key={i.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{when(i.created_at)}</td>
                      <td className="px-4 py-3 capitalize text-slate-700">{label(i.fitting_type)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {top ? (
                          <>
                            <span className="font-medium">{top.product_code}</span>
                            <span className="block max-w-[240px] truncate text-xs text-slate-500">{top.name}</span>
                          </>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {i.extracted ? (
                          <span className={conf >= threshold ? "font-medium text-emerald-700" : conf >= 0.5 ? "text-amber-700" : "text-rose-700"}>
                            {Math.round(conf * 100)}%
                          </span>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{i.rounds ? `${i.rounds} round${i.rounds > 1 ? "s" : ""}` : "–"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {chosenP ? (
                          <span className="text-emerald-700">Customer picked {chosenP.product_code}</span>
                        ) : i.handed_off ? (
                          <span className="text-amber-700">Sent to team</span>
                        ) : (
                          <span className="text-slate-400">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
