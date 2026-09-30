import { useMemo, useState, type FormEvent } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  CalendarRange,
  Check,
  FileText,
  Hash,
  Landmark,
  Lock,
  LogIn,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStore } from "../../context/StoreContext";
import { useAccounting } from "../../context/AccountingContext";
import { useReceipts } from "../../context/ReceiptContext";
import { formatIDR, formatDate } from "../../lib/format";
import { nextInvoiceNumber } from "../../lib/invoice";
import {
  buildSoldItems,
  soldItemsSummary,
  type SoldItem,
} from "../../lib/accounting";

type PeriodFilter = "day" | "week" | "month" | "year" | "all" | "custom";

const PERIOD_OPTIONS: { id: PeriodFilter; label: string }[] = [
  { id: "day", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom range" },
];

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  }
  return formatIDR(value);
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <span
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          accent ? "bg-gold-500/15 text-gold-300" : "bg-primary/10 text-primary-400"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="truncate font-heading text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground/60">
        {label}
        {hint && <span className="text-foreground/45"> · {hint}</span>}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Date-range helpers                                                  */
/* ------------------------------------------------------------------ */

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function makeRange(
  filter: PeriodFilter,
  from: string,
  to: string
): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (filter) {
    case "day": {
      const start = startOfToday();
      return { from: start, to: new Date(start.getTime() + 86400000 - 1) };
    }
    case "week":
      return { from: startOfWeek(), to: null };
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null };
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: null };
    case "custom": {
      const fromD = from ? new Date(`${from}T00:00:00`) : null;
      const toD = to ? new Date(`${to}T23:59:59.999`) : null;
      return {
        from: fromD && !Number.isNaN(fromD.getTime()) ? fromD : null,
        to: toD && !Number.isNaN(toD.getTime()) ? toD : null,
      };
    }
    default:
      return { from: null, to: null };
  }
}

/* ------------------------------------------------------------------ */
/* Page gate                                                           */
/* ------------------------------------------------------------------ */

export default function AdminSales() {
  const { user, isAdmin, openAuth, signOut } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/100/25 text-primary-400 ring-1 ring-primary-400/40">
          <Lock className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Owners only</h1>
        <p className="mt-2 text-foreground/60">
          Offline sales and the sold-items ledger are part of the admin console. Sign in with an
          owner or superadmin account to continue.
        </p>
        <button type="button" className="btn btn-primary mt-6" onClick={() => openAuth("signin")}>
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in to continue
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">This area needs admin access</h1>
        <p className="mt-2 text-foreground/60">
          You&apos;re signed in as <strong>{user.name}</strong> ({user.email}) — a customer
          account. Ask the store owner for an admin account.
        </p>
        <button type="button" className="btn btn-outline mt-6" onClick={signOut}>
          Switch account
        </button>
      </div>
    );
  }

  return <SalesConsole />;
}

/* ------------------------------------------------------------------ */
/* Console                                                             */
/* ------------------------------------------------------------------ */

function SalesConsole() {
  const { products, orders } = useStore();
  const accounting = useAccounting();
  const { sales, addSale, deleteSale } = accounting;
  const { receipts, settings } = useReceipts();
  const { isOwner } = useAuth();
  const canEdit = isOwner;

  const [filter, setFilter] = useState<PeriodFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  // Record-offline-sale form state
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const receiptNumbers = useMemo(
    () => new Map(receipts.map((r) => [r.orderId, r.number])),
    [receipts]
  );
  const allNumbers = useMemo(
    () => [...receipts.map((r) => r.number), ...sales.map((s) => s.invoiceNumber)],
    [receipts, sales]
  );

  const nextInvoice = useMemo(
    () => nextInvoiceNumber(settings.receiptPrefix, settings.invoiceStart, allNumbers, new Date()),
    [settings.receiptPrefix, settings.invoiceStart, allNumbers]
  );

  const soldItems = useMemo(
    () => buildSoldItems(orders, sales, receiptNumbers),
    [orders, sales, receiptNumbers]
  );

  const range = useMemo(
    () => makeRange(filter, customFrom, customTo),
    [filter, customFrom, customTo]
  );

  const filtered = useMemo(() => {
    const fromT = range.from?.getTime() ?? null;
    const toT = range.to?.getTime() ?? null;
    return soldItems.filter((i) => {
      const t = new Date(i.date).getTime();
      if (fromT !== null && t < fromT) return false;
      if (toT !== null && t > toT) return false;
      return true;
    });
  }, [soldItems, range]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)), [filtered]);
  const summary = useMemo(() => soldItemsSummary(filtered), [filtered]);

  const onlineRevenue = filtered
    .filter((i) => i.channel === "online")
    .reduce((s, i) => s + i.total, 0);
  const offlineRevenue = filtered
    .filter((i) => i.channel === "offline")
    .reduce((s, i) => s + i.total, 0);

  function pickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setUnitPrice(p ? String(p.price) : "");
  }

  function recordSale(e: FormEvent) {
    e.preventDefault();
    const product = products.find((p) => p.id === productId);
    if (!product) {
      setFormError("Pick the product that was sold at the counter.");
      return;
    }
    const q = Math.max(1, Math.round(Number(qty) || 0));
    const price = Math.max(0, Math.round(Number(unitPrice) || 0));
    if (price <= 0) {
      setFormError("Set a selling price above 0.");
      return;
    }
    if (!date) {
      setFormError("Pick the sale date.");
      return;
    }
    const invoiceNumber = nextInvoiceNumber(
      settings.receiptPrefix,
      settings.invoiceStart,
      allNumbers,
      date
    );
    addSale({
      invoiceNumber,
      productId: product.id,
      productName: product.name,
      image: product.image,
      qty: q,
      unitPrice: price,
      total: price * q,
      date: new Date(`${date}T12:00:00`).toISOString(),
      note: note.trim() || undefined,
    });
    setNotice(`Sale recorded — ${invoiceNumber} · ${product.name} × ${q}.`);
    setFormError(null);
    setQty("1");
    setUnitPrice(String(product.price));
    setNote("");
  }

  function removeSale(id: string) {
    deleteSale(id);
    setConfirming(null);
    setNotice("Offline sale removed — revenue recalculates in the P&L instantly.");
  }

  const periodLabel = PERIOD_OPTIONS.find((o) => o.id === filter)?.label ?? "All time";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Back office · Point of sale</p>
          <h2 className="mt-1 flex items-center gap-2 font-heading text-2xl font-bold">
            <Store className="h-6 w-6 text-primary-400" aria-hidden="true" />
            Offline sales &amp; sold items
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-foreground/55">
            Record showroom / store-counter purchases and review everything that&apos;s been sold —
            online orders and offline sales side by side, each with its selling price and invoice
            number.
          </p>
        </div>
        <div role="group" aria-label="Sold-item period filter" className="flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={filter === o.id}
              className={`chip ${filter === o.id ? "chip-active" : ""}`}
              onClick={() => setFilter(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-2xl border border-gold-500/25 bg-gold-500/10 px-4 py-3 text-sm font-semibold text-gold-300">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          You&apos;re viewing sales read-only — only a superadmin or the store owner can record
          offline sales.
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-400">
          {notice}
        </p>
      )}

      {/* Custom range picker */}
      {filter === "custom" && (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="sales-from" className="field-label">From</label>
            <input
              id="sales-from"
              type="date"
              className="input"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sales-to" className="field-label">To</label>
            <input
              id="sales-to"
              type="date"
              className="input"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setCustomFrom("");
              setCustomTo("");
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" /> Clear range
          </button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={BadgeDollarSign}
          label="Revenue"
          value={formatCompact(summary.revenue)}
          hint={periodLabel.toLowerCase()}
        />
        <KpiTile
          icon={ShoppingBag}
          label="Units sold"
          value={String(summary.units)}
          hint={`${summary.items} line item${summary.items === 1 ? "" : "s"}`}
        />
        <KpiTile
          icon={FileText}
          label="Invoices"
          value={String(summary.invoices)}
          hint={`${summary.onlineInvoices} online · ${summary.offlineInvoices} offline`}
        />
        <KpiTile
          icon={Landmark}
          label="Offline revenue"
          value={formatCompact(offlineRevenue)}
          hint="showroom & counter"
          accent
        />
      </div>

      {/* Channel split */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-bold text-primary-400">
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" /> Online {formatIDR(onlineRevenue)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 font-bold text-gold-300">
          <Store className="h-3.5 w-3.5" aria-hidden="true" /> Offline {formatIDR(offlineRevenue)}
        </span>
        <span className="ml-auto text-xs text-foreground/45">
          Next invoice number: <span className="font-mono font-bold text-primary-400">{nextInvoice}</span>
        </span>
      </div>

      {/* Record offline sale */}
      {canEdit && (
        <form onSubmit={recordSale} className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-heading font-bold">
                <Store className="h-4.5 w-4.5 text-primary-400" aria-hidden="true" />
                Record an offline / store sale
              </h3>
              <p className="mt-0.5 text-sm text-foreground/55">
                Sold over the counter, at a match or via your marketplace partner — log it here and
                it lands in the accounting P&amp;L as store revenue.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary-400">
              Will be invoiced as <span className="font-mono">{nextInvoice}</span>
            </span>
          </div>

          {formError && (
            <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="sale-product" className="field-label">Product *</label>
              <select id="sale-product" className="input" value={productId} onChange={(e) => pickProduct(e.target.value)}>
                <option value="">— choose a product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatIDR(p.price)}
                  </option>
                ))}
              </select>
              {products.length === 0 && (
                <p className="mt-1 text-xs text-foreground/50">The catalogue is empty — add products first.</p>
              )}
            </div>
            <div>
              <label htmlFor="sale-qty" className="field-label">Quantity *</label>
              <input
                id="sale-qty"
                type="number"
                min="1"
                step="1"
                className="input"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="sale-date" className="field-label">Date *</label>
              <input id="sale-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="sale-price" className="field-label">Unit selling price (Rp) *</label>
              <input
                id="sale-price"
                type="number"
                min="1"
                step="1"
                className="input"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Auto-filled from the product price — adjust if discounted"
              />
              <p className="mt-1 text-xs text-foreground/50">
                Pre-filled from the product price — adjust for counter discounts or bundle deals.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="sale-note" className="field-label">Note (optional)</label>
              <input
                id="sale-note"
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Sold at the Senayan showroom, cash"
              />
            </div>
            <div className="flex items-end lg:col-span-2">
              <button type="submit" className="btn btn-primary w-full">
                <Plus className="h-4 w-4" aria-hidden="true" /> Record sale
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Sold items list */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-heading font-bold">Sold items</h3>
          <p className="mt-0.5 text-xs text-foreground/55">
            {sorted.length} line item{sorted.length === 1 ? "" : "s"} in this view · online orders
            count once their payment is accepted, offline sales count the moment they&apos;re recorded.
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Package className="mx-auto h-10 w-10 text-foreground/25" aria-hidden="true" />
            <p className="mt-4 font-heading text-lg font-bold">
              {soldItems.length === 0 ? "Nothing sold yet" : "No sales in this period"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-foreground/55">
              {soldItems.length === 0
                ? "Record your first offline sale above, or accept a payment on the Orders tab — sold items appear here with their selling price and invoice number."
                : "Try a wider period or clear the custom range — every accepted order and recorded offline sale is a sold item."}
            </p>
            {canEdit && soldItems.length === 0 && products.length > 0 && (
              <button
                type="button"
                className="btn btn-primary mt-4"
                onClick={() => {
                  pickProduct(products[0]?.id ?? "");
                  document.getElementById("sale-product")?.focus();
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Record the first sale
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <caption className="sr-only">
                Sold items with invoice number, date, product, quantity, unit price, total and channel
              </caption>
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-foreground/45">
                  <th scope="col" className="px-5 py-3 font-bold">Invoice</th>
                  <th scope="col" className="px-3 py-3 font-bold">Date</th>
                  <th scope="col" className="px-3 py-3 font-bold">Product</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Qty</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Unit price</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Total</th>
                  <th scope="col" className="px-3 py-3 font-bold">Channel</th>
                  {canEdit && <th scope="col" className="px-3 py-3 text-right font-bold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((i) => (
                  <SoldItemRow
                    key={i.id}
                    item={i}
                    canEdit={canEdit}
                    confirming={confirming === i.id}
                    onConfirm={() => setConfirming(i.id)}
                    onCancelConfirm={() => setConfirming(null)}
                    onDelete={() => removeSale(i.id)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-foreground/10">
                  <th scope="row" colSpan={4} className="px-5 py-3 font-heading font-bold">
                    Total · {summary.units} unit{summary.units === 1 ? "" : "s"}
                  </th>
                  <td className="px-3 py-3 text-right font-bold text-primary-400">{formatIDR(summary.revenue)}</td>
                  <td colSpan={2} className="px-3 py-3 text-right font-bold">{formatIDR(summary.revenue)}</td>
                  {canEdit && <td className="px-3 py-3" />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Explainer */}
      <div className="rounded-2xl border border-border bg-foreground/10 p-5">
        <h3 className="flex items-center gap-2 font-heading font-bold">
          <Hash className="h-4 w-4 text-primary-400" aria-hidden="true" /> How invoices &amp; filters work
        </h3>
        <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm text-foreground/65 sm:grid-cols-2">
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
            Invoice numbers share one per-year sequence with order receipts — set the prefix and
            starting number in Configuration → Receipt &amp; layout.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
            Every new sale takes the next free number automatically — the preview updates as you record.
          </li>
          <li className="flex gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
            The filters slice by the sale date — today, this week, this month, this year or a custom
            from–to range.
          </li>
          <li className="flex gap-2">
            <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
            Offline sales feed straight into the monthly P&amp;L on the Accounting &amp; payroll page as
            store revenue.
          </li>
        </ul>
        <p className="mt-3 text-xs text-foreground/45">
          Sold items and invoice settings are saved to this browser&apos;s admin settings and synced
          with your Supabase config when available.
        </p>
      </div>
    </div>
  );
}

function SoldItemRow({
  item,
  canEdit,
  confirming,
  onConfirm,
  onCancelConfirm,
  onDelete,
}: {
  item: SoldItem;
  canEdit: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className={item.channel === "offline" ? "bg-gold-500/5" : ""}>
      <td className="px-5 py-3 font-mono text-xs font-bold text-primary-400">{item.invoiceNumber}</td>
      <td className="px-3 py-3 whitespace-nowrap text-foreground/70">{formatDate(item.date)}</td>
      <td className="px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {item.image ? (
            <img src={item.image} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-foreground/10 object-cover" />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-400">
              <Package className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{item.productName}</p>
            {item.note && <p className="truncate text-xs text-foreground/50">{item.note}</p>}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right font-semibold">{item.qty}</td>
      <td className="px-3 py-3 text-right">{formatIDR(item.unitPrice)}</td>
      <td className="px-3 py-3 text-right font-heading font-bold text-primary-400">{formatIDR(item.total)}</td>
      <td className="px-3 py-3">
        {item.channel === "offline" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2.5 py-1 text-xs font-bold text-gold-300">
            <Store className="h-3 w-3" aria-hidden="true" /> Offline
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary-400">
            <TrendingUp className="h-3 w-3" aria-hidden="true" /> Online
          </span>
        )}
      </td>
      {canEdit && (
        <td className="px-3 py-3 text-right">
          {item.channel === "offline" ? (
            confirming ? (
              <span className="inline-flex gap-1.5">
                <button type="button" className="btn btn-primary !bg-destructive !px-2.5 !py-1 text-xs text-on-primary" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                </button>
                <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={onCancelConfirm}>Keep</button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-ghost !px-2.5 !py-1 text-xs text-destructive"
                onClick={onConfirm}
                aria-label={`Delete sale ${item.invoiceNumber}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )
          ) : (
            <span className="text-[11px] font-semibold text-foreground/40">order receipt</span>
          )}
        </td>
      )}
    </tr>
  );
}
