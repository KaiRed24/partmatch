import "server-only";

/**
 * Sends the out-of-stock delay email (plan section 8), in this order of preference:
 *  1. n8n: if N8N_DELAY_WEBHOOK_URL is set, POST the details there and let the workflow send the email.
 *  2. Resend: if RESEND_API_KEY is set, send it directly from here.
 *  3. Preview: neither is set, so nothing is sent; the dashboard shows the email so the demo still works.
 */

export type DelayEmail = {
  to: string;
  customerName: string;
  orderRef: string;
  productName: string;
  productCode: string;
  promisedDate: string | null;
  revisedDate: string;
  reason: string | null;
  links: { wait: string; part_ship: string; refund: string };
};

export type SendResult = { channel: "n8n" | "resend" | "preview"; id?: string; subject: string; html: string; text: string };

const ukDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderDelayEmail(d: DelayEmail): { subject: string; html: string; text: string } {
  const first = d.customerName.split(" ")[0];
  const subject = `Update on your order ${d.orderRef}: new delivery date`;
  const intro = `We're sorry: the ${d.productName} (${d.productCode}) on your order is taking longer to reach us than expected.`;
  const eta = `We now expect to despatch it by ${ukDate(d.revisedDate)}${d.promisedDate ? ` (originally ${ukDate(d.promisedDate)})` : ""}.`;
  const options = [
    { key: "wait" as const, label: "Wait for it", help: "Keep your order as it is. We'll send everything together." },
    { key: "part_ship" as const, label: "Send what's ready", help: "We send anything in stock now and this part when it arrives." },
    { key: "refund" as const, label: "Refund this item", help: "We cancel this item and refund it to your original payment method." },
  ];

  const text = [
    `Hi ${first},`,
    "",
    intro,
    eta,
    d.reason ? `Reason: ${d.reason}` : "",
    "",
    "What would you like us to do?",
    ...options.map((o) => `- ${o.label}: ${d.links[o.key]}`),
    "",
    "If we don't hear from you, we'll hold your order and send it as soon as the part arrives.",
    "",
    "Thanks for your patience,",
    "The customer service team",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:'DM Sans',Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0e4a7a;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:700">Order ${esc(d.orderRef)}</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px">Hi ${esc(first)},</p>
<p style="margin:0 0 12px">${esc(intro)}</p>
<p style="margin:0 0 12px;font-weight:600">${esc(eta)}</p>
${d.reason ? `<p style="margin:0 0 12px;color:#475569">Reason: ${esc(d.reason)}</p>` : ""}
<p style="margin:20px 0 12px;font-weight:700">What would you like us to do?</p>
${options
  .map(
    (o) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px"><tr><td>
<a href="${esc(d.links[o.key])}" style="display:block;background:${o.key === "wait" ? "#0e4a7a" : "#ffffff"};color:${o.key === "wait" ? "#ffffff" : "#0e4a7a"};border:2px solid #0e4a7a;border-radius:10px;padding:12px 16px;text-decoration:none;font-weight:700">${esc(o.label)}
<span style="display:block;font-weight:400;font-size:13px;opacity:.85;margin-top:2px">${esc(o.help)}</span></a></td></tr></table>`,
  )
  .join("\n")}
<p style="margin:20px 0 0;font-size:14px;color:#475569">If we don't hear from you, we'll hold your order and send it as soon as the part arrives.</p>
<p style="margin:16px 0 0">Thanks for your patience,<br>The customer service team</p>
</td></tr>
<tr><td style="padding:12px 24px;background:#f8fafc;font-size:12px;color:#94a3b8">PartMatch prototype · demo order with fictional data</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}

export async function sendDelayEmail(d: DelayEmail): Promise<SendResult> {
  const rendered = renderDelayEmail(d);

  const hook = process.env.N8N_DELAY_WEBHOOK_URL;
  if (hook) {
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, ...rendered }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`n8n webhook failed (${res.status})`);
    return { channel: "n8n", ...rendered };
  }

  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "PartMatch Demo <onboarding@resend.dev>",
        to: [d.to],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(`Resend failed (${res.status}): ${json.message ?? "unknown error"}`);
    return { channel: "resend", id: json.id, ...rendered };
  }

  return { channel: "preview", ...rendered };
}
