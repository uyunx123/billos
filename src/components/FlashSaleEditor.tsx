import { useState, type FormEvent } from "react";
import { Banknote, CalendarClock, Check, Flame, Percent, X } from "lucide-react";
import { Modal } from "./ui";
import type { Product } from "../data/products";
import type { FlashSale } from "../lib/flashSale";
import { flashDiscountPercent, flashPhase } from "../lib/flashSale";
import { formatIDR } from "../lib/format";
import { useStore } from "../context/StoreContext";

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(input: string): string | undefined {
  if (!input) return undefined;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function defaultEnd(): string {
  const d = new Date(Date.now() + 48 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return toLocalInput(d.toISOString()) ?? "";
}

interface FormState {
  mode: "percent" | "fixed";
  value: string;
  startsAt: string;
  endsAt: string;
  stockLimit: string;
}

/**
 * Admin editor for adding (or removing) a flash sale on one or many products.
 * Rendered inside the admin console's Products tab.
 */
export default function FlashSaleEditor({
  products,
  onClose,
}: {
  products: Product[];
  onClose: () => void;
}) {
  const { setFlashSaleBulk } = useStore();
  const [form, setForm] = useState<FormState>(() => {
    const first = products.find((p) => p.flashSale?.enabled);
    const f = first?.flashSale;
    return {
      mode: f?.salePrice ? "fixed" : "percent",
      value: f?.salePrice
        ? String(f.salePrice)
        : f?.discountPercent
          ? String(f.discountPercent)
          : "20",
      startsAt: toLocalInput(f?.startsAt),
      endsAt: toLocalInput(f?.endsAt) || defaultEnd(),
      stockLimit: f?.stockLimit != null ? String(f.stockLimit) : "",
    };
  });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function buildSale(): FlashSale | undefined {
    const endsAt = toIso(form.endsAt);
    if (!endsAt) {
      setError("Set an end date & time — every flash sale needs to finish.");
      return undefined;
    }
    const startsAt = toIso(form.startsAt);
    if (startsAt && endsAt && new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      setError("The sale can't end before it starts — fix the dates.");
      return undefined;
    }
    if (form.mode === "percent") {
      const pct = Math.round(Number(form.value) || 0);
      if (pct < 1 || pct > 95) {
        setError("Percent discount must be between 1 and 95.");
        return undefined;
      }
      return {
        enabled: true,
        discountPercent: pct,
        startsAt: startsAt ?? undefined,
        endsAt,
        stockLimit: form.stockLimit.trim() ? Math.max(1, Math.round(Number(form.stockLimit) || 0)) : undefined,
      };
    }
    const price = Math.round(Number(form.value) || 0);
    if (price < 100) {
      setError("Sale price must be a valid Rupiah amount (minimum Rp 100).");
      return undefined;
    }
    return {
      enabled: true,
      salePrice: price,
      startsAt: startsAt ?? undefined,
      endsAt,
      stockLimit: form.stockLimit.trim() ? Math.max(1, Math.round(Number(form.stockLimit) || 0)) : undefined,
    };
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const sale = buildSale();
    if (!sale) return;
    setFlashSaleBulk(products.map((p) => p.id), sale);
    onClose();
  }

  function clearAll() {
    setFlashSaleBulk(products.map((p) => p.id), undefined);
    onClose();
  }

  const hasLive = products.some((p) => flashPhase(p) === "live");
  const single = products.length === 1;

  return (
    <Modal open onClose={onClose} title={single ? "Flash sale" : `Flash sale — ${products.length} products`} size="lg">
      <form onSubmit={save} className="space-y-4">
        {single && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3.5">
            <img src={products[0].image} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-foreground/10 object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{products[0].name}</p>
              <p className="text-xs text-foreground/55">
                Base {formatIDR(products[0].price)}
                {products[0].flashSale?.enabled && (
                  <span className="ml-2 rounded-full bg-gold-500/15 px-2 py-0.5 font-bold text-gold-300">
                    currently {flashDiscountPercent(products[0])}% off
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {hasLive && (
          <p className="rounded-xl border border-gold-500/25 bg-gold-500/10 px-3.5 py-2.5 text-sm font-semibold text-gold-300">
            <Flame className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            One or more of these products has a live sale — updating it applies instantly to shoppers.
          </p>
        )}

        {/* Discount */}
        <div>
          <span className="field-label">Discount</span>
          <div role="radiogroup" aria-label="Flash sale discount type" className="flex flex-wrap gap-2">
            {(
              [
                { id: "percent", label: "% Percent off", icon: Percent },
                { id: "fixed", label: "Rp Sale price", icon: Banknote },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={form.mode === opt.id}
                onClick={() => set("mode", opt.id)}
                className={`chip ${form.mode === opt.id ? "chip-active" : ""}`}
              >
                <opt.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fs-value" className="field-label">
              {form.mode === "percent" ? "Percent off (1–95)" : "Sale price (Rp)"}
            </label>
            <input
              id="fs-value"
              type="number"
              min={form.mode === "percent" ? 1 : 100}
              step={form.mode === "percent" ? 1 : 1000}
              className="input"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="fs-stock" className="field-label">Stock limit (optional)</label>
            <input
              id="fs-stock"
              type="number"
              min="1"
              className="input"
              value={form.stockLimit}
              onChange={(e) => set("stockLimit", e.target.value)}
              placeholder="units at sale price"
            />
            <p className="mt-1 text-xs text-foreground/50">Leave empty for no limit — sold units show on the progress bar.</p>
          </div>
          <div>
            <label htmlFor="fs-from" className="field-label">Starts (optional)</label>
            <input id="fs-from" type="datetime-local" className="input" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            <p className="mt-1 text-xs text-foreground/50">Leave empty to start right away.</p>
          </div>
          <div>
            <label htmlFor="fs-until" className="field-label">Ends *</label>
            <input id="fs-until" type="datetime-local" className="input" required value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </div>
        </div>

        <p className="flex items-center gap-2 rounded-xl border border-border bg-foreground/10 px-3.5 py-2.5 text-sm text-foreground/60">
          <CalendarClock className="h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
          Shoppers see the sale on the flash-sale page at <span className="font-mono font-bold text-foreground">/flash-sale</span>, on product
          cards, and at checkout — the discounted price is charged automatically.
        </p>

        {error && (
          <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button type="submit" className="btn btn-accent">
            <Flame className="h-4 w-4" aria-hidden="true" /> Apply flash sale
          </button>
          {products.some((p) => p.flashSale?.enabled) && (
            <button type="button" className="btn btn-ghost text-destructive" onClick={clearAll}>
              <X className="h-4 w-4" aria-hidden="true" /> Remove sale
            </button>
          )}
          <span className="ml-auto flex gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              <Check className="h-4 w-4" aria-hidden="true" /> Cancel
            </button>
          </span>
        </div>
      </form>
    </Modal>
  );
}
