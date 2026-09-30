import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Flame, Hourglass, ShoppingCart, Sparkles, Zap } from "lucide-react";
import { useFlashSales } from "../hooks/useFlashSales";
import { countdownParts, flashDiscountPercent, flashPrice, flashStock } from "../lib/flashSale";
import { useCart } from "../context/CartContext";
import { formatIDR } from "../lib/format";
import { usePageMeta } from "../hooks/usePageMeta";
import JsonLd from "../components/JsonLd";
import { CATEGORIES, type Product } from "../data/products";

function FlashCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );
  const pct = flashDiscountPercent(product);
  const salePrice = flashPrice(product);
  const { limit, remaining, pct: soldPct } = flashStock(product);
  const outOfStock = product.stock <= 0 || (limit > 0 && remaining <= 0);
  const categoryName = CATEGORIES.find((c) => c.id === product.category)?.name ?? "Gear";

  function handleAdd() {
    if (outOfStock) return;
    addItem(product, 1);
    setAdded(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="card lift group flex h-full flex-col overflow-hidden transition-colors duration-300 hover:border-gold-400/60">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-gradient-to-br from-primary-900 via-primary-950 to-background" aria-label={product.name}>
        <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-2.5 py-1 text-[11px] font-bold text-primary-950 shadow-gold">
          <Zap className="h-3 w-3" aria-hidden="true" /> Flash · −{pct}%
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-400">{categoryName}</p>
        <h3 className="line-clamp-2 font-heading text-[15px] font-bold leading-snug sm:text-base">
          <Link to={`/product/${product.slug}`} className="transition-colors duration-150 hover:text-gold-600">
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="font-heading text-xl font-bold tracking-tight text-gold-300">{formatIDR(salePrice)}</p>
            <p className="text-sm font-semibold text-foreground/45 line-through">{formatIDR(product.price)}</p>
          </div>

          {limit > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/55">
                <span>{remaining} left at this price</span>
                <span>{soldPct}% claimed</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={soldPct}
                aria-label={`${soldPct}% of flash stock claimed`}
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all duration-300"
                  style={{ width: `${soldPct}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className={`btn mt-3 w-full justify-center py-2.5 text-sm transition-all duration-200 ${
              outOfStock
                ? "border border-border bg-foreground/10 !text-foreground/40"
                : added
                  ? "btn-primary !bg-none !bg-primary-700"
                  : "btn-accent"
            }`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Added to cart
              </>
            ) : outOfStock ? (
              "Sold out"
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Add to cart
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function TimeCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-14 flex-col items-center rounded-xl border border-border bg-surface-2 px-2.5 py-2 shadow-soft sm:min-w-16">
      <span className="font-heading text-xl font-extrabold tabular-nums text-foreground sm:text-2xl">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/45">{label}</span>
    </div>
  );
}

export default function FlashSalePage() {
  const { live, upcoming, now } = useFlashSales();
  usePageMeta({
    title: "Flash Sale — ISAK Billiard Co.",
    description:
      "Time-boxed discounts on competition cues, gloves, cases and more. Limited stock at the sale price — grab them before the countdown ends.",
    canonical: `${window.location.origin}/flash-sale`,
  });

  const endsAt = live.reduce<string | null>((acc, p) => {
    const t = p.flashSale?.endsAt;
    if (!t) return acc;
    return acc === null || new Date(t).getTime() < new Date(acc).getTime() ? t : acc;
  }, null);
  const countdown = endsAt ? countdownParts(new Date(endsAt).getTime(), now) : null;

  const totalSaved = live.reduce((sum, p) => {
    const saved = p.price - flashPrice(p);
    return sum + (saved > 0 ? saved : 0);
  }, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "ISAK Billiard Co. Flash Sale",
          itemListElement: live.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.name,
              image: p.image,
              url: `${window.location.origin}/product/${p.slug}`,
              offers: {
                "@type": "Offer",
                price: flashPrice(p),
                priceCurrency: "IDR",
                availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              },
            },
          })),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gold-500/30 bg-gradient-to-br from-primary-900 via-primary-950 to-background px-6 py-10 shadow-soft sm:px-10 sm:py-14">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow flex items-center gap-1.5">
              <Flame className="h-4 w-4" aria-hidden="true" /> Flash sale
            </p>
            <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
              {live.length > 0 ? (
                <>
                  Today&apos;s <span className="text-gradient-gold">hot deals</span>
                </>
              ) : (
                <>
                  The next <span className="text-gradient-gold">flash sale</span>
                </>
              )}
            </h1>
            <p className="mt-3 text-foreground/65 sm:text-base">
              {live.length > 0
                ? `${live.length} product${live.length === 1 ? "" : "s"} discounted right now — limited stock at the sale price, first come first served.`
                : upcoming.length > 0
                  ? "A flash sale is warming up. Come back when the countdown hits zero, or keep shopping the full collection."
                  : "No flash sale is running at the moment. Check back soon — and in the meantime the full collection is always open."}
            </p>
            {live.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link to="/shop" className="btn btn-outline">
                  Browse the full shop
                </Link>
                {totalSaved > 0 && (
                  <span className="rounded-full bg-gold-500/15 px-3 py-1.5 text-xs font-bold text-gold-300">
                    Up to {formatIDR(totalSaved)} off in one cart
                  </span>
                )}
              </div>
            )}
          </div>

          {countdown && (
            <div className="w-full lg:w-auto" role="timer" aria-label={`Flash sale ends in ${countdown.label}`}>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
                <Hourglass className="h-4 w-4" aria-hidden="true" /> Ends in
              </p>
              <div className="flex gap-2" aria-hidden="true">
                {countdown.days > 0 && <TimeCell value={String(countdown.days).padStart(2, "0")} label="days" />}
                <TimeCell value={String(countdown.hours).padStart(2, "0")} label="hours" />
                <TimeCell value={String(countdown.minutes).padStart(2, "0")} label="min" />
                <TimeCell value={String(countdown.seconds).padStart(2, "0")} label="sec" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Live sale grid */}
      {live.length > 0 ? (
        <section className="mt-10" aria-labelledby="flash-live-heading">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-300" aria-hidden="true" />
            <h2 id="flash-live-heading" className="font-heading text-2xl font-bold">Live now</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {live.map((p) => (
              <FlashCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-10 rounded-3xl border border-dashed border-border px-6 py-16 text-center" aria-labelledby="flash-empty-heading">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-500/10 text-gold-300">
            <Flame className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 id="flash-empty-heading" className="mt-5 font-heading text-2xl font-bold">
            {upcoming.length > 0 ? "Almost here…" : "No flash sale running"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-foreground/60">
            {upcoming.length > 0
              ? `${upcoming.length} deal${upcoming.length === 1 ? "" : "s"} go${upcoming.length === 1 ? "es" : ""} live soon. Watch this space — or grab something from the full collection.`
              : "Deals appear here the moment the store owner switches one on. Meanwhile the shop is open and shipping."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/shop" className="btn btn-primary">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Shop the collection
            </Link>
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="mt-10" aria-labelledby="flash-upcoming-heading">
          <h2 id="flash-upcoming-heading" className="font-heading text-2xl font-bold">Going live soon</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {upcoming.map((p) => {
              const target = p.flashSale?.startsAt ? new Date(p.flashSale.startsAt).getTime() : 0;
              const cd = target > 0 ? countdownParts(target, now) : null;
              return (
                <article key={p.id} className="card flex flex-col p-5">
                  <img src={p.image} alt="" className="aspect-square w-full rounded-2xl bg-foreground/10 object-cover" />
                  <h3 className="mt-3 line-clamp-2 font-heading text-sm font-bold leading-snug">{p.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-foreground/55">
                    <span className="text-gold-300">{formatIDR(flashPrice(p))}</span>{" "}
                    <span className="line-through text-foreground/40">{formatIDR(p.price)}</span>
                  </p>
                  {cd && (
                    <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gold-500/10 px-2.5 py-1 text-[11px] font-bold text-gold-300">
                      <Hourglass className="h-3 w-3" aria-hidden="true" /> Starts in {cd.label}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}