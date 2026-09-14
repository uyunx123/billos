import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Check,
  ChevronRight,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Undo2,
} from "lucide-react";
import { CATEGORIES as FALLBACK_CATEGORIES } from "../data/products";
import { useStore } from "../context/StoreContext";
import { useConfig } from "../context/ConfigContext";
import { useReviews } from "../context/ReviewContext";
import { formatIDR } from "../lib/format";
import { useCart } from "../context/CartContext";
import ProductCard from "../components/ProductCard";
import QuantityStepper from "../components/QuantityStepper";
import JsonLd from "../components/JsonLd";
import VideoEmbed from "../components/VideoEmbed";
import { usePageMeta } from "../hooks/usePageMeta";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products } = useStore();
  const { categories } = useConfig();
  const { summaryForProduct, reviewsForProduct } = useReviews();
  const product = slug ? products.find((p) => p.slug === slug) : undefined;
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<number | null>(null);

  usePageMeta({
    title: product ? `${product.name} — ISAK Billiard Co.` : "Product not found — ISAK Billiard Co.",
    description: product?.blurb ?? product?.description,
    canonical: product ? `${window.location.origin}/product/${product.slug}` : undefined,
    image: product?.image,
    type: "product",
  });

  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-foreground/60">That cue seems to have rolled off the table.</p>
        <Link to="/shop" className="btn btn-primary mt-6">Back to shop</Link>
      </div>
    );
  }

  const categoryName = categories.find((c) => c.id === product.category)?.name
    ?? FALLBACK_CATEGORIES.find((c) => c.id === product.category)?.name
    ?? "Gear";
  const outOfStock = product.stock <= 0;
  const enabledCatIds = new Set(categories.filter((c) => c.enabled).map((c) => c.id));
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id && enabledCatIds.has(p.category))
    .slice(0, 4);
  const discount = product.compareAt
    ? Math.round((1 - product.price / product.compareAt) * 100)
    : 0;
  const summary = summaryForProduct(product);
  const verifiedReviews = reviewsForProduct(product.id);

  const handleAdd = () => {
    if (outOfStock) return;
    addItem(product, qty);
    setAdded(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  }

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image,
    description: product.description,
    sku: product.id,
    brand: { "@type": "Brand", name: "ISAK Billiard Co." },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: summary.rating,
      reviewCount: summary.reviews,
      bestRating: 5,
      worstRating: 1,
    },
    offers: {
      "@type": "Offer",
      url: `${window.location.origin}/product/${product.slug}`,
      priceCurrency: "IDR",
      price: product.price,
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shop", item: `${window.location.origin}/shop` },
      { "@type": "ListItem", position: 2, name: categoryName, item: `${window.location.origin}/shop?category=${product.category}` },
      { "@type": "ListItem", position: 3, name: product.name },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={[productLd, breadcrumbLd]} />
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-foreground/55">
        <Link to="/shop" className="hover:text-gold-300">Shop</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <Link to={`/shop?category=${product.category}`} className="hover:text-gold-300">
          {categoryName}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-foreground/80">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary-100 via-muted to-primary-50 shadow-soft">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {discount > 0 && (
              <span className="rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-3 py-1 text-xs font-bold text-primary-950 shadow-gold">
                Save {discount}%
              </span>
            )}
            {product.freeShipping && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-600/95 px-3 py-1 text-xs font-bold text-on-primary ring-1 ring-white/20">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Free shipping
              </span>
            )}
            {product.featured && (
              <span className="rounded-full border border-white/25 bg-primary-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-200 backdrop-blur">
                Featured
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary-200">
            <span className="h-px w-6 bg-gradient-to-r from-gold-500 to-transparent" aria-hidden="true" />
            {categoryName}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground/70">
            <span className="flex gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i <= Math.round(summary.rating) ? "fill-gold-500 text-gold-500" : "fill-foreground/15 text-foreground/15"
                  }`}
                />
              ))}
            </span>
            <span className="font-semibold">{summary.rating.toFixed(1)}</span>
            <span>({summary.reviews} reviews)</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/10 px-5 py-4">
            <p className="font-heading text-3xl font-bold tracking-tight">{formatIDR(product.price)}</p>
            {product.compareAt && (
              <p className="text-lg font-semibold text-destructive/60 line-through">
                {formatIDR(product.compareAt)}
              </p>
            )}
            {product.compareAt && (
              <span className="rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-2.5 py-1 text-xs font-bold text-primary-950 shadow-gold">
                Save {discount}%
              </span>
            )}
          </div>

          <p className="mt-4 leading-relaxed text-foreground/75">{product.description}</p>

          {product.videoUrl && (
            <div className="mt-6">
              <VideoEmbed url={product.videoUrl} title={`${product.name} — video review`} />
            </div>
          )}

          <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
            {outOfStock ? (
              <>
                <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
                <span className="text-destructive">Out of stock — restock soon</span>
              </>
            ) : product.stock <= 3 ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                <span className="text-accent">Only {product.stock} left in stock</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                <span className="text-primary-200">In stock and ready to ship</span>
              </>
            )}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={outOfStock ? 1 : product.stock} />
            <button
              type="button"
              className={`btn flex-1 justify-center whitespace-nowrap sm:flex-none sm:px-9 ${added ? "btn-primary !bg-none !bg-primary-700" : "btn-primary"}`}
              disabled={outOfStock}
              onClick={handleAdd}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" /> Added to cart
                </>
              ) : outOfStock ? (
                "Out of stock"
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Add to cart
                </>
              )}
            </button>
          </div>

          <ul className="mt-8 grid gap-3 rounded-2xl border border-border bg-white/10 p-5 text-sm sm:grid-cols-3">
            <li className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3.5 py-3 ring-1 ring-border/60">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 text-primary-200">
                <Truck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold leading-snug">
                {product.freeShipping
                  ? "Free shipping on this item — no minimum"
                  : "Free shipping over Rp 1.000.000"}
              </span>
            </li>
            <li className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3.5 py-3 ring-1 ring-border/60">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-100 to-gold-200 text-gold-300">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold leading-snug">30-day easy returns</span>
            </li>
            <li className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3.5 py-3 ring-1 ring-border/60">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 text-primary-200">
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold leading-snug">QRIS, VA, e-wallet &amp; card</span>
            </li>
          </ul>
        </div>
      </div>

      {verifiedReviews.length > 0 && (
        <section className="mt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">From the rack</p>
              <h2 className="section-title mt-3">Verified buyer reviews</h2>
            </div>
            <span className="rounded-full bg-gold-100 px-3 py-1 text-sm font-bold text-gold-200">
              {summary.rating.toFixed(1)} / 5 · {verifiedReviews.length} new
            </span>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {verifiedReviews.map((r) => (
              <li key={r.id} className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-xs font-extrabold text-on-primary">
                      {r.author.slice(0, 1).toUpperCase()}
                    </span>
                    {r.author}
                  </p>
                  <span className="flex gap-0.5" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-gold-500 text-gold-500" : "fill-foreground/15 text-foreground/15"}`}
                      />
                    ))}
                  </span>
                </div>
                {r.comment && <p className="mt-3 text-sm leading-relaxed text-foreground/75">{r.comment}</p>}
                {r.media.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.media.map((m, i) =>
                      m.kind === "image" ? (
                        <img key={i} src={m.dataUrl} alt={`Review photo ${i + 1}`} className="h-16 w-16 rounded-lg border border-border object-cover" />
                      ) : (
                        <video key={i} src={m.dataUrl} controls preload="metadata" className="h-16 w-24 rounded-lg border border-border bg-black" />
                      )
                    )}
                  </div>
                )}
                <p className="mt-3 text-xs font-semibold text-foreground/45">
                  Verified purchase · {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(r.at))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Complete the rack</p>
              <h2 className="section-title mt-3">You might also like</h2>
            </div>
            <Link to="/shop" className="btn btn-ghost whitespace-nowrap text-sm">
              View all <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}