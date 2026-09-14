import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer, ReceiptText } from "lucide-react";
import { useStore, labelForStatus } from "../context/StoreContext";
import { useReceipts, type ReceiptData, type ReceiptSettingsConfig } from "../context/ReceiptContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { formatIDR } from "../lib/format";
import { BRAND_LOGO } from "../lib/logo";

interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

/** A single order's printable receipt: auto-generated at checkout, savable as
 *  HTML or printed straight from the browser (save-as-PDF is built into the
 *  print dialog). */
export default function ReceiptPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const { orders } = useStore();
  const { receiptForOrder, settings } = useReceipts();
  const order = orders.find((o) => o.id === orderId);
  const receipt = receiptForOrder(orderId);
  const data = receipt?.data;

  usePageMeta({
    title: `Receipt ${data?.number ?? orderId} — ISAK Billiard Co.`,
    description: `Receipt for order ${orderId}. Save it or print it for your records.`,
  });

  const totals: Totals | null = useMemo(() => {
    if (!data) return null;
    const linesTotal = data.items.reduce((s, it) => s + it.total, 0);
    return {
      subtotal: data.subtotal ?? linesTotal,
      discount: data.discount ?? 0,
      shipping: data.shipping ?? 0,
      total: data.total,
    };
  }, [data]);

  function handleDownload() {
    if (!data || !totals) return;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(data.number)} — ${escapeHtml(settings.storeName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Inter, system-ui, -apple-system, sans-serif; color: #1c2536; margin: 0; padding: 32px; background: #f3f5f9; }
  .sheet { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 14px; padding: 40px; box-shadow: 0 10px 30px rgba(15,23,42,.12); }
  .head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 2px solid #3056d3; padding-bottom: 18px; }
  .store h1 { margin: 0; font-size: 22px; color: #1c2536; }
  .store p { margin: 2px 0 0; color: #5b6472; font-size: 13px; }
  h2 { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #8a93a5; margin: 26px 0 6px; }
  .muted { color: #5b6472; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #8a93a5; border-bottom: 1px solid #e2e6ee; padding: 8px 0; }
  td { padding: 9px 0; border-bottom: 1px solid #eef1f6; font-size: 14px; }
  td.num, th.num { text-align: right; }
  .totals { margin-top: 14px; margin-left: auto; width: 260px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
  .totals .grand { border-top: 2px solid #1c2536; margin-top: 6px; padding-top: 10px; font-weight: 700; font-size: 16px; }
  .totals .coupon { color: #0f7b3e; font-weight: 600; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  footer { margin-top: 28px; padding-top: 14px; border-top: 1px dashed #c8cfdc; color: #5b6472; font-size: 12px; }
</style></head><body><div class="sheet">
${renderReceipt(data, totals, settings)}
</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${data.number}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  if (!order || !data || !totals) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-200 ring-1 ring-primary-400/40">
          <ReceiptText className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Receipt not found</h1>
        <p className="mt-2 text-foreground/60">
          We couldn&apos;t find a receipt for <span className="font-bold">{orderId}</span> in this browser.
        </p>
        <Link to="/orders" className="btn btn-accent mt-6">Back to my orders</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/orders" className="btn btn-ghost -ml-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My orders
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={handleDownload}>
            <Download className="h-4 w-4" aria-hidden="true" /> Save
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Print / PDF
          </button>
        </div>
      </div>

      <p className="no-print mt-4 text-xs text-foreground/50">
        Order <span className="font-bold text-foreground/70">{order.id}</span> ·{" "}
        <Link to="/orders" className="font-bold text-primary-200 hover:underline">track its status</Link>
      </p>

      <div className="receipt-sheet card mt-4 overflow-hidden !rounded-2xl">
        <div className="relative border-b border-border px-6 py-6 sm:px-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 print:hidden" aria-hidden="true" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={BRAND_LOGO} alt={`${settings.storeName} logo`} className="h-12 w-12 rounded-xl bg-white object-contain p-1" />
              <div>
                <p className="font-heading text-xl font-bold">{settings.storeName}</p>
                <p className="text-xs text-foreground/55">{settings.tagline}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-lg font-bold text-primary-200">{data.number}</p>
              <p className="text-xs text-foreground/55">Issued {new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short" }).format(new Date(data.issuedAt))}</p>
              {settings.showStatus && (
                <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${data.paymentStatus === "accepted" ? "bg-primary/10 text-primary-200" : data.status === "Cancelled" ? "bg-destructive/10 text-destructive" : "bg-gold-100 text-gold-200"}`}>
                  {labelForStatus(data.paymentStatus)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 border-t border-border px-6 py-5 sm:grid-cols-2 sm:px-8">
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/45">Billed to</h2>
            <p className="mt-1.5 font-semibold">{data.customer.name}</p>
            {(data.customer.email || data.customer.phone) && (
              <p className="text-sm text-foreground/60">
                {data.customer.email}
                {data.customer.email && data.customer.phone ? " · " : ""}
                {data.customer.phone}
              </p>
            )}
            <p className="mt-1 text-sm text-foreground/60">
              {data.customer.address && <span className="block">{data.customer.address}</span>}
              {[data.customer.city, data.customer.province].filter(Boolean).join(", ")}
              {data.customer.postalCode && ` ${data.customer.postalCode}`}
            </p>
          </div>
          <div className="sm:text-right">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/45">From</h2>
            <p className="mt-1.5 font-semibold">{settings.storeName}</p>
            <p className="text-sm text-foreground/60">{settings.address}</p>
            <p className="text-sm text-foreground/60">
              {settings.phone}
              {settings.phone && settings.email ? " · " : ""}
              {settings.email}
            </p>
          </div>
        </div>

        <div className="px-6 pb-5 sm:px-8">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/45">Items</h2>
          <ul className="mt-2 divide-y divide-border">
            {data.items.map((it, idx) => (
              <li key={idx} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{it.name}</span>
                  <span className="text-xs text-foreground/50">{formatIDR(it.price)} × {it.qty}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatIDR(it.total)}</span>
              </li>
            ))}
          </ul>

          <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-foreground/55">Subtotal</dt><dd className="font-semibold">{formatIDR(totals.subtotal)}</dd></div>
            {totals.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-foreground/55">{data.couponCode ? `Coupon (${data.couponCode})` : "Discount"}</dt>
                <dd className="font-semibold text-gold-200">−{formatIDR(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between"><dt className="text-foreground/55">Shipping ({data.carrier || "delivery"})</dt><dd className="font-semibold">{formatIDR(totals.shipping)}</dd></div>
            <div className="flex justify-between border-t border-border pt-2"><dt className="font-bold">Total</dt><dd className="font-heading text-lg font-bold text-primary-200">{formatIDR(totals.total)}</dd></div>
          </dl>

          <p className="mt-4 text-xs text-foreground/55">
            Paid via {data.payment || "the selected payment method"}.
          </p>
        </div>

        <div className="border-t border-dashed border-border px-6 py-4 sm:px-8">
          <p className="text-xs leading-relaxed text-foreground/55">{settings.footerNote}</p>
          <p className="mt-2 text-[11px] text-foreground/40">
            {settings.storeName} · {settings.address} · {settings.phone} · {settings.email}
          </p>
        </div>
      </div>

      <p className="no-print mt-4 text-center text-xs text-foreground/45">
        Save the receipt as HTML, or print/save-as-PDF for your records. Need help?{" "}
        <Link to="/contact" className="font-bold text-primary-200 hover:underline">Contact us</Link>.
      </p>
    </div>
  );
}

function renderReceipt(
  data: ReceiptData,
  totals: Totals,
  settings: Pick<ReceiptSettingsConfig, "storeName" | "tagline" | "address" | "phone" | "email" | "footerNote">
): string {
  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  const rows = data.items
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.name)}<br><span class="muted">${fmt(it.price)} × ${it.qty}</span></td><td class="num">${fmt(it.total)}</td></tr>`
    )
    .join("");
  const couponRow =
    totals.discount > 0
      ? `<div class="coupon"><span>${data.couponCode ? `Coupon (${escapeHtml(data.couponCode)})` : "Discount"}</span><span>−${fmt(totals.discount)}</span></div>`
      : "";
  return `
  <div class="head">
    <div class="store"><h1>${escapeHtml(settings.storeName)}</h1><p>${escapeHtml(settings.tagline)}</p></div>
    <div style="text-align:right"><strong>${escapeHtml(data.number)}</strong><br><span class="muted">${new Date(data.issuedAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}</span></div>
  </div>
  <h2>Billed to</h2>
  <div class="grid">
    <div><strong>${escapeHtml(data.customer.name)}</strong><br><span class="muted">${escapeHtml(data.customer.email ?? "")}${data.customer.phone ? `<br>${escapeHtml(data.customer.phone)}` : ""}<br>${escapeHtml(data.customer.address ?? "")}<br>${escapeHtml([data.customer.city, data.customer.province].filter(Boolean).join(", "))} ${escapeHtml(data.customer.postalCode ?? "")}</span></div>
    <div><strong>${escapeHtml(settings.storeName)}</strong><br><span class="muted">${escapeHtml(settings.address)}<br>${escapeHtml(settings.phone)} · ${escapeHtml(settings.email)}</span></div>
  </div>
  <h2>Items</h2>
  <table><thead><tr><th>Item</th><th class="num">Total</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals">
    <div><span>Subtotal</span><span>${fmt(totals.subtotal)}</span></div>
    ${couponRow}
    <div><span>Shipping (${escapeHtml(data.carrier ?? "delivery")})</span><span>${fmt(totals.shipping)}</span></div>
    <div class="grand"><span>Total</span><span>${fmt(totals.total)}</span></div>
  </div>
  <p class="muted" style="margin-top:16px">Paid via ${escapeHtml(data.payment || "the selected payment method")}.</p>
  <footer>${escapeHtml(settings.footerNote)}</footer>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}