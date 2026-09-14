import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PackageSearch, Search, Sparkles, Truck, X } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useConfig } from "../context/ConfigContext";
import ProductCard from "../components/ProductCard";
import { getSponsoredProducts } from "../lib/sponsoredProducts";
import { usePageMeta } from "../hooks/usePageMeta";

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

export default function ShopPage() {
  const { products } = useStore();
  const { categories, partners } = useConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "all";
  const [sort, setSort] = useState<SortKey>("featured");

  const enabledCategories = useMemo(() => categories.filter((c) => c.enabled), [categories]);
  const enabledIds = useMemo(() => new Set(enabledCategories.map((c) => c.id)), [enabledCategories]);
  const activeCategory = enabledCategories.find((c) => c.id === category);
  const activeCatId = activeCategory ? activeCategory.id : "all";

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const matchesCategory = activeCatId === "all" || p.category === activeCatId;
      const matchesEnabled = enabledIds.has(p.category);
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCategory && matchesEnabled && matchesQuery;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, activeCatId, enabledIds, query, sort]);

  /* ---- Sponsored: official sponsor-brand products pinned above the list ---- */
  const sponsoredPool = useMemo(() => {
    const sponsorIds = partners.filter((p) => p.active).map((p) => p.id);
    return getSponsoredProducts(products, sponsorIds);
  }, [products, partners]);

  const sponsoredPicks = useMemo(() => {
    if (sponsoredPool.length === 0) return [];
    const q = query.trim().toLowerCase();
    // Preferred: sponsor products already visible in the current category/query.
    const inView = new Set(filtered.map((p) => p.id));
    let pool = sponsoredPool.filter((p) => inView.has(p.id));
    // During a search with no sponsor match, fall back to top partner picks.
    if (q && pool.length === 0) pool = sponsoredPool;
    return [...pool]
      .sort(
        (a, b) =>
          Number(b.featured ?? false) - Number(a.featured ?? false) || b.rating - a.rating
      )
      .slice(0, 4);
  }, [sponsoredPool, filtered, query]);

  // The grid below omits the sponsored picks rendered above it (no duplicates).
  const gridItems = useMemo(() => {
    const pinned = new Set(sponsoredPicks.map((p) => p.id));
    return filtered.filter((p) => !pinned.has(p.id));
  }, [filtered, sponsoredPicks]);

  usePageMeta({
    title: `${activeCategory ? `${activeCategory.name} collection` : "Shop"} — ISAK Billiard Co.`,
    description: `Browse ${filtered.length} billiard product${filtered.length === 1 ? "" : "s"} — cues, tables, balls and gear, ships nationwide with live tracking.`,
  });

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 shadow-soft sm:px-10 sm:py-14">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-primary-200/40 blur-3xl" aria-hidden="true" />
        <p className="eyebrow">{activeCategory ? activeCategory.name : "The full shop"}</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          {activeCategory ? `${activeCategory.name} collection` : "Browse the shop"}
        </h1>
        <p className="mt-4 max-w-lg text-foreground/65 sm:text-base">
          {filtered.length} product{filtered.length === 1 ? "" : "s"}
          {query ? ` matching “${query}”` : ""} — exact gear, plus honest care.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-gold-100/60 px-3.5 py-1.5 text-xs font-bold text-gold-200">
          <Truck className="h-3.5 w-3.5" aria-hidden="true" />
          Official store · Free shipping above Rp 1.000.000
        </span>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-20 -mx-4 mb-8 border-b border-border/80 bg-background/90 px-4 py-3 shadow-[0_10px_24px_-20px_oklch(0.24_0.05_150/0.5)] backdrop-blur-xl sm:top-[4.5rem] sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
              aria-hidden="true"
            />
            <input
              id="shop-search"
              type="search"
              value={query}
              onChange={(e) => updateParam("q", e.target.value)}
              placeholder="Search cues, chalk, tables…"
              className="input !pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="whitespace-nowrap text-sm font-semibold text-foreground/60">
              Sort by
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="input !w-auto !py-2"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`chip ${activeCatId === "all" ? "chip-active" : ""}`}
            onClick={() => updateParam("category", "all")}
          >
            All
          </button>
          {enabledCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip whitespace-nowrap ${activeCatId === c.id ? "chip-active" : ""}`}
              onClick={() => updateParam("category", c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sponsored — official sponsor-brand products pinned above the list */}
      {sponsoredPicks.length > 0 && (
        <section aria-label="Sponsored products" className="mb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-100/70 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-gold-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Sponsored
            </span>
            <p className="text-sm font-semibold text-foreground/70">
              Partner picks from our official brands
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
            {sponsoredPicks.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        gridItems.length > 0 ? (
          <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
            {gridItems.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        ) : null
      ) : (
        <div className="card mx-auto max-w-md p-10 text-center">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/25 text-primary-200 ring-1 ring-primary-400/40">
            <PackageSearch className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="font-heading text-lg font-bold">Nothing on the felt</h2>
          <p className="mt-2 text-sm text-foreground/60">
            We couldn&apos;t find anything matching your search. Try another keyword
            or browse the full collection.
          </p>
          <button
            type="button"
            className="btn btn-accent mt-5"
            onClick={() => setSearchParams({}, { replace: true })}
          >
            <X className="h-4 w-4" aria-hidden="true" /> Clear filters
          </button>
        </div>
      )}

    </div>
  );
}