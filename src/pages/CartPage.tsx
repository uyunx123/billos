import { Link } from "react-router-dom";
import { ArrowRight, PackageOpen, ShieldCheck, Sparkles, Trash2, Truck } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useStore } from "../context/StoreContext";
import { formatIDR } from "../lib/format";
import QuantityStepper from "../components/QuantityStepper";

export default function CartPage() {
  const { lines, subtotal, count, setQty, removeItem } = useCart();
  const { products, settings } = useStore();

  const FREE_SHIPPING_THRESHOLD = settings.freeShippingThreshold;
  // Every line flagged "ships free" → the whole delivery is free, no minimum.
  const allFreeShip =
    count > 0 && lines.every((l) => products.find((p) => p.id === l.productId)?.freeShipping);
  const savings = lines.reduce((s, l) => {
    const p = products.find((prod) => prod.id === l.productId);
    return p?.compareAt && p.compareAt > p.price ? s + (p.compareAt - p.price) * l.qty : s;
  }, 0);

  if (count === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-200 ring-1 ring-primary-400/40">
          <PackageOpen className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Your bag is empty</h1>
        <p className="mt-2 text-foreground/60">
          The table&apos;s set and the rack&apos;s ready — but nothing&apos;s in the
          bag yet. Browse the shop and take your pick.
        </p>
        <Link to="/shop" className="btn btn-accent mt-6">
          Browse the shop <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-4 text-xs text-foreground/50">
          Free shipping above Rp 1.000.000 · quality checked before shipping
        </p>
      </div>
    );
  }

  const progress = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <p className="eyebrow">Almost there</p>
          <span className="h-px flex-1 bg-gradient-to-r from-gold-500/40 to-transparent" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Your bag</h1>
        <p className="mt-1 text-foreground/60">
          {count} item{count === 1 ? "" : "s"} ready to roll.
        </p>
      </div>

      {/* Free shipping progress */}
      <div className="card mb-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold">
            {allFreeShip ? (
              <>
                <Sparkles className="mr-1.5 inline h-4 w-4 text-gold-500" aria-hidden="true" />
                <span className="font-bold text-primary-200">Everything in your bag ships free — nice rack!</span>
              </>
            ) : remaining > 0 ? (
              <>
                <Sparkles className="mr-1.5 inline h-4 w-4 text-gold-500" aria-hidden="true" />
                Add <span className="font-bold text-primary-200">{formatIDR(remaining)}</span> more for free shipping
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 inline h-4 w-4 text-gold-500" aria-hidden="true" />
                <span className="font-bold text-primary-200">You&apos;ve unlocked free shipping — nice rack!</span>
              </>
            )}
          </p>
          <p className="text-xs font-semibold text-foreground/55">
            {formatIDR(Math.min(subtotal, FREE_SHIPPING_THRESHOLD))} of {formatIDR(FREE_SHIPPING_THRESHOLD)}
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress toward free shipping"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-4">
          {lines.map((line) => {
            const product = products.find((p) => p.id === line.productId);
            if (!product) return null;
            return (
              <li key={line.productId} className="card lift flex gap-4 p-4 transition-colors duration-300 hover:border-gold-400/50 sm:items-center">
                <Link
                  to={`/product/${product.slug}`}
                  className="block h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-100 via-muted to-primary-50 sm:h-28 sm:w-28"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link to={`/product/${product.slug}`} className="font-heading font-bold transition-colors hover:text-gold-300">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm text-foreground/55">{formatIDR(product.price)} each</p>
                    {product.compareAt && (
                      <p className="text-xs text-destructive/60 line-through">{formatIDR(product.compareAt)}</p>
                    )}
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {product.freeShipping && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-200">
                          <Truck className="h-3 w-3" aria-hidden="true" /> Free shipping
                        </span>
                      )}
                      {product.compareAt && (
                        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold text-gold-200">
                          Save {Math.round((1 - product.price / product.compareAt) * 100)}%
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <QuantityStepper value={line.qty} onChange={(n) => setQty(product.id, n)} max={product.stock || 99} />
                    <p className="w-24 text-right font-heading text-base font-bold">{formatIDR(product.price * line.qty)}</p>
                    <button
                      type="button"
                      className="btn btn-ghost !px-2 text-destructive"
                      aria-label={`Remove ${product.name} from cart`}
                      onClick={() => removeItem(product.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="card h-fit overflow-hidden p-6 lg:sticky lg:top-40">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400" aria-hidden="true" />
          <h2 className="font-heading text-lg font-bold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-foreground/60">Subtotal</dt>
              <dd className="font-semibold">{formatIDR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground/60">Shipping</dt>
              <dd className="font-semibold">
                {allFreeShip
                  ? "Free — all items ship free"
                  : remaining > 0
                    ? "Calculated at checkout"
                    : "Free"}
              </dd>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-gold-200">
                <dt className="font-semibold">You save</dt>
                <dd className="font-bold">{formatIDR(savings)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-heading text-xl font-bold text-primary-200">{formatIDR(subtotal)}</dd>
            </div>
          </dl>
          <Link to="/checkout" className="btn btn-accent mt-6 w-full !py-3.5">
            Proceed to checkout <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/shop" className="btn btn-ghost mt-2 w-full">Continue shopping</Link>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-foreground/55">
            <ShieldCheck className="h-3.5 w-3.5 text-gold-300" aria-hidden="true" />
            Secure checkout · QRIS, VA, e-wallet &amp; card
          </p>
        </aside>
      </div>
    </div>
  );
}