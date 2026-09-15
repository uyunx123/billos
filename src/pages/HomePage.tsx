import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgePercent,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useConfig } from "../context/ConfigContext";
import { useReviews } from "../context/ReviewContext";
import { MARKETPLACES } from "../data/marketplaces";
import { sanitizeUrl } from "../lib/security";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { usePageMeta } from "../hooks/usePageMeta";
import { formatDate } from "../lib/format";

const VALUES = [
  { icon: ShieldCheck, title: "Guaranteed original", text: "Every cue and table sourced directly from factories we audit." },
  { icon: Truck, title: "Ships nationwide", text: "JNE, J&T and SiCepat with live tracking on every order." },
  { icon: CreditCard, title: "Pay your way", text: "QRIS, virtual account, e-wallet or card — or check out on our Shopee & Tokopedia official stores." },
  { icon: BadgePercent, title: "Fair prices", text: "Tournament-grade gear without the tournament markup." },
];

const TESTIMONIALS = [
  {
    quote: "The cue arrived straight and perfectly balanced. The team's follow-up was better than any online store I've dealt with.",
    name: "Andi Pratama",
    role: "League player · Jakarta",
    initials: "AP",
  },
  {
    quote: "They re-felted my table and levelled it in a single visit. It rolls exactly like the club tables now.",
    name: "Nuraini Sari",
    role: "Home table owner · Bandung",
    initials: "NS",
  },
  {
    quote: "Ordered our league's ball sets on Monday, tracked the whole way, and they landed Wednesday. Flawless.",
    name: "Rafi Maulana",
    role: "Club captain · Surabaya",
    initials: "RM",
  },
];

export default function HomePage() {
  const { products } = useStore();
  const { categories, posts, siteConfig, partners } = useConfig();
  const { reviews } = useReviews();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);

  const hero = siteConfig.hero;
  const heroImages = hero.images;

  // Autoplay the hero carousel unless the user is interacting or prefers reduced motion.
  useEffect(() => {
    if (heroImages.length < 2 || slidePaused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % heroImages.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [slidePaused, heroImages.length]);
  const prevSlide = () => setSlideIndex((i) => (i - 1 + heroImages.length) % heroImages.length);
  const nextSlide = () => setSlideIndex((i) => (i + 1) % heroImages.length);

  // Keep the active slide valid when the admin edits the hero images.
  useEffect(() => {
    setSlideIndex((i) => Math.min(i, Math.max(0, heroImages.length - 1)));
  }, [heroImages.length]);

  usePageMeta({
    title: "ISAK Billiard Co. — Official Store for Cues, Tables & Gear",
    description:
      "Tournament cues, tables, balls and gear from Jakarta — order here or via our Shopee & Tokopedia official stores, with live tracking on every order.",
  });

  const enabledCategories = categories.filter((c) => c.enabled);
  const enabledCatIds = new Set(enabledCategories.map((c) => c.id));
  const featured = products.filter((p) => p.featured && enabledCatIds.has(p.category));
  const countFor = (id: string) => products.filter((p) => p.category === id).length;
  const activeSponsors = partners.filter((p) => p.active);
  // Partners flagged as "Main sponsor" in the admin console get the big
  // transparent logo treatment; the rest keep the compact partner pills below.
  const mainSponsors = activeSponsors.filter((s) => s.isMain);
  const partnerList = activeSponsors.filter((s) => !s.isMain);

  // Verified-review summary for the homepage section.
  const productById = new Map(products.map((p) => [p.id, p]));
  const topReviews = reviews.slice(0, 4);
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const photoWall = reviews
    .flatMap((r) =>
      r.media
        .filter((m) => m.kind === "image")
        .map((m) => ({ src: m.dataUrl, review: r }))
    )
    .slice(0, 6);

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-background">
        {/* Ambient: soft gold glow behind the headline + faint dot texture */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(52%_55%_at_38%_8%,oklch(0.78_0.13_84/0.16),transparent_70%)]"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-60" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-primary-200/50 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          <div className="max-w-xl">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-surface-2/60 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold-600" aria-hidden="true" />
              {hero.badge}
            </span>
            <h1 className="animate-fade-up mt-6 text-balance font-heading text-[2.5rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl" style={{ animationDelay: "90ms" }}>
              {hero.titleLine1}
              <span className="text-gradient-deep mt-1 block italic">{hero.titleLine2}</span>
            </h1>
            <p className="animate-fade-up mt-5 max-w-md text-base leading-relaxed text-foreground/65 sm:text-lg" style={{ animationDelay: "180ms" }}>
              {hero.text}
            </p>
            <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ animationDelay: "270ms" }}>
              <Link to="/shop" className="btn btn-accent w-full !px-7 !py-3.5 text-sm sm:w-auto">
                Shop the collection <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/shop?category=cues" className="btn btn-outline w-full text-sm sm:w-auto">
                Browse cues
              </Link>
            </div>

            <dl className="animate-fade-up mt-10 grid max-w-md grid-cols-3 divide-x divide-border border-y border-border py-5" style={{ animationDelay: "360ms" }}>
              {[
                ["12k+", "players equipped"],
                ["4.8/5", "average rating"],
                ["98%", "delivered on time"],
              ].map(([num, label]) => (
                <div key={label} className="px-3 first:pl-0">
                  <dd className="font-heading text-2xl font-bold text-gold-600">{num}</dd>
                  <dt className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/55">{label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero art — showroom carousel */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gold-400/20 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface-2 p-3 shadow-lift ring-1 ring-gold-400/20">
              <div
                role="group"
                aria-roledescription="carousel"
                aria-label="ISAK Billiard showroom highlights"
                className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] bg-primary-950 sm:aspect-[4/3]"
                onMouseEnter={() => setSlidePaused(true)}
                onMouseLeave={() => setSlidePaused(false)}
                onFocusCapture={() => setSlidePaused(true)}
                onBlurCapture={() => setSlidePaused(false)}
              >
                {heroImages.map((src, i) => (
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt={`${hero.badge} highlight`}
                    loading={i === 0 ? "eager" : "lazy"}
                    aria-hidden={i !== slideIndex}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
                      i === slideIndex ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  />
                ))}

                {/* Prev / next */}
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous showroom photo"
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/20 bg-primary-950/60 text-white backdrop-blur-md transition-all duration-200 hover:border-gold-300 hover:bg-gold-400 hover:text-primary-950 active:scale-95"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next showroom photo"
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/20 bg-primary-950/60 text-white backdrop-blur-md transition-all duration-200 hover:border-gold-300 hover:bg-gold-400 hover:text-primary-950 active:scale-95"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>

                {/* Slide counter */}
                <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-primary-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-200 backdrop-blur">
                  {slideIndex + 1} / {heroImages.length}
                </span>

                {/* Dots */}
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2" role="tablist" aria-label="Showroom photos">
                  {heroImages.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setSlideIndex(i)}
                      aria-label={`Show hero photo ${i + 1}`}
                      aria-current={i === slideIndex ? "true" : undefined}
                      className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${
                        i === slideIndex
                          ? "w-6 bg-gold-400"
                          : "w-2 bg-white/40 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {/* gold hairline detail */}
              <span className="absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
            </div>

            <div className="absolute -left-3 top-8 hidden animate-float items-center gap-3 rounded-2xl border border-border bg-surface-2/85 p-3.5 pr-5 shadow-soft backdrop-blur-xl sm:flex">
              <span className="flex gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
                ))}
              </span>
              <span className="text-xs font-bold text-foreground">4.8/5 from 12,000+ players</span>
            </div>
            <div className="absolute -bottom-5 -right-2 hidden animate-float-slow items-center gap-2 rounded-2xl border border-border bg-surface-2/85 px-4 py-3 shadow-soft backdrop-blur-xl sm:flex">
              <Truck className="h-4 w-4 text-gold-600" aria-hidden="true" />
              <span className="text-xs font-bold text-foreground">Free shipping over Rp 1jt</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Partners ===== */}
      <section aria-label="Partners" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        {activeSponsors.length > 0 && (
          <div>
            {/* Main sponsors — big logo only, transparent background, ahead of the partner list */}
            {mainSponsors.length > 0 && (
              <div className="mb-10">
                <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-foreground/45">
                  Main sponsor
                </p>
                <ul className="flex flex-wrap items-center justify-center gap-10 sm:gap-14">
                  {mainSponsors.map((s) => (
                    <li key={s.id}>
                      <a
                        href={sanitizeUrl(s.url, "#")}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={s.name}
                        title={s.name}
                        className="group inline-block transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                      >
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.name}
                            loading="lazy"
                            className="h-16 w-auto object-contain transition-transform duration-300 ease-out group-hover:scale-105 sm:h-24"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="font-heading text-xl font-bold text-foreground/80">{s.name}</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Partner list */}
            {partnerList.length > 0 && (
              <div>
                <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-foreground/45">
                  In partnership with
                </p>
                <ul className="flex flex-wrap items-center justify-center gap-4">
                  {partnerList.map((s) => (
                    <li key={s.id}>
                      <a
                        href={sanitizeUrl(s.url, "#")}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={s.name}
                        title={s.name}
                        className="group grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white p-1 shadow-soft ring-1 ring-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-gold hover:ring-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.name}
                            loading="lazy"
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="h-full w-full rounded-full bg-gradient-to-br from-gold-300 to-gold-600"
                          />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== Official stores band ===== */}
      <section aria-label="Official stores" className="border-y border-border bg-foreground/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="mb-5 text-center text-[11px] font-bold uppercase tracking-[0.24em] text-foreground/45">
            Order on your favourite marketplace · Official stores
          </p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max animate-marquee gap-4">
              {[0, 1].map((dup) => (
                <div key={dup} aria-hidden={dup === 1} className="flex gap-4">
                  {MARKETPLACES.map((m) => (
                    <a
                      key={m.id}
                      href={m.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 whitespace-nowrap rounded-2xl border border-border bg-surface-2 px-5 py-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-gold"
                    >
                      <span className={`grid h-8 w-8 place-items-center rounded-xl ${m.chip}`}>
                        <m.Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-left">
                        <span className="block font-heading text-sm font-bold text-foreground/80">{m.name}</span>
                        <span className="block text-xs text-foreground/50">{m.handle}</span>
                      </span>
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Categories ===== */}
      {enabledCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Curated collections</p>
              <h2 className="section-title mt-3">Shop by category</h2>
              <p className="section-lead">Everything for the table, the club, and the road.</p>
            </div>
            <Link to="/shop" className="btn btn-outline shrink-0 text-sm">
              All products <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>

          <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
            {enabledCategories.map((c, i) => (
              <li key={c.id} className={i < 2 ? "col-span-2 sm:col-span-1" : ""}>
                <Reveal delay={(i % 3) * 70} className="h-full">
                  <Link
                    to={`/shop?category=${c.id}`}
                    className="card lift group relative block overflow-hidden"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary-900 via-primary-950 to-background">
                      <img
                        src={c.image}
                        alt={c.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-950/85 via-primary-950/15 to-transparent" aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                      <div className="min-w-0 text-on-primary">
                        <p className="font-heading text-base font-bold sm:text-lg">{c.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-on-primary/75">{c.blurb}</p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300">
                          {countFor(c.id)} products
                        </p>
                      </div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/25 bg-surface-2/15 text-on-primary backdrop-blur-md transition-all duration-300 group-hover:translate-x-0.5 group-hover:border-gold-300 group-hover:bg-gold-400 group-hover:text-primary-950">
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ===== Featured ===== */}
      <section className="bg-gradient-to-b from-muted/70 to-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Handpicked for you</p>
              <h2 className="section-title mt-3">Featured gear</h2>
              <p className="section-lead">The pieces our own players keep coming back to.</p>
            </div>
            <Link to="/shop" className="btn btn-ghost whitespace-nowrap text-sm">
              View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>

          <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.map((p, i) => (
              <li key={p.id}>
                <Reveal delay={(i % 4) * 70} className="h-full">
                  <ProductCard product={p} />
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Value props ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow justify-center">Why players shop with us</p>
          <h2 className="section-title mt-3">Built for the game you love</h2>
        </Reveal>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <li key={v.title}>
              <Reveal delay={i * 70} className="h-full">
                <div className="card lift h-full p-6">
                  <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-100 to-gold-200/70 text-gold-300 ring-1 ring-gold-500/40">
                    <v.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-heading text-lg font-bold">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/60">{v.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ===== Testimonials ===== */}
      <section className="relative overflow-hidden border-y border-border bg-foreground/10 py-16 lg:py-24">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow justify-center">Player stories</p>
            <h2 className="section-title mt-3">Loved on tables across Indonesia</h2>
          </Reveal>

          <ul className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <li key={t.name}>
                <Reveal delay={i * 80} className="h-full">
                  <figure className="card lift flex h-full flex-col p-6">
                    <span className="flex items-center justify-between">
                      <Quote className="h-7 w-7 text-gold-500" aria-hidden="true" />
                      <span className="flex gap-0.5" aria-label="5 out of 5 stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="h-3.5 w-3.5 fill-gold-500 text-gold-500" aria-hidden="true" />
                        ))}
                      </span>
                    </span>
                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/75">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-heading text-xs font-bold text-primary-950">
                        {t.initials}
                      </span>
                      <span>
                        <span className="block text-sm font-bold">{t.name}</span>
                        <span className="block text-xs text-foreground/55">{t.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Verified reviews ===== */}
      {reviews.length > 0 && (
        <section className="relative overflow-hidden border-y border-border bg-surface-2 py-16 lg:py-24" aria-label="Verified customer reviews">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" aria-hidden="true" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Verified reviews</p>
                <h2 className="section-title mt-3">Rated by players, backed by photos</h2>
                <p className="section-lead">
                  Real buyers, real tables, real sticks — with photos and full item reviews.
                </p>
              </div>
              <Link to="/shop" className="btn btn-outline shrink-0 text-sm">
                Shop the gear they rated <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
              {/* Rating summary */}
              <Reveal className="h-full">
                <div className="card flex h-full flex-col p-6">
                  <div className="flex items-end gap-3">
                    <p className="font-heading text-5xl font-bold tracking-tight text-primary-400">
                      {avgRating.toFixed(1)}
                    </p>
                    <div className="pb-1.5">
                      <span className="flex gap-0.5" aria-label={`${avgRating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i <= Math.round(avgRating) ? "fill-gold-500 text-gold-500" : "fill-foreground/15 text-foreground/15"}`}
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                      <p className="mt-1 text-xs font-semibold text-foreground/55">
                        {reviews.length} verified review{reviews.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2">
                    {ratingDist.map((d) => {
                      const pct = reviews.length ? Math.round((d.count / reviews.length) * 100) : 0;
                      return (
                        <li key={d.star} className="flex items-center gap-2.5 text-xs">
                          <span className="w-6 shrink-0 font-bold text-foreground/60">{d.star}★</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="w-8 shrink-0 text-right font-semibold text-foreground/50">{d.count}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="mt-auto border-t border-border pt-4 text-xs leading-relaxed text-foreground/55">
                    Every review below is tied to a real order and a specific item — tap any product
                    name to see its full verified review history.
                  </p>
                </div>
              </Reveal>

              <div className="space-y-5">
                {/* Photo wall */}
                {photoWall.length > 0 && (
                  <Reveal delay={60}>
                    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6" aria-label="Customer review photos">
                      {photoWall.map((p, i) => (
                        <li key={i} className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-foreground/10">
                          <img
                            src={p.src}
                            alt={`Review photo from ${p.review.author}`}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                          />
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                )}

                {/* Review cards */}
                <ul className="grid gap-4 sm:grid-cols-2">
                  {topReviews.map((r, i) => {
                    const prod = productById.get(r.productId);
                    return (
                      <li key={r.id}>
                        <Reveal delay={i * 70} className="h-full">
                          <figure className="card lift flex h-full flex-col p-5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-gold-500 text-gold-500" : "fill-foreground/15 text-foreground/15"}`}
                                    aria-hidden="true"
                                  />
                                ))}
                              </span>
                              {r.media.some((m) => m.kind === "image") && (
                                <span className="flex gap-1" aria-hidden="true">
                                  {r.media
                                    .filter((m) => m.kind === "image")
                                    .slice(0, 3)
                                    .map((m, j) => (
                                      <img
                                        key={j}
                                        src={m.dataUrl}
                                        alt=""
                                        className="h-9 w-9 rounded-lg border border-border object-cover"
                                      />
                                    ))}
                                </span>
                              )}
                            </div>
                            {r.comment && (
                              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/75">
                                &ldquo;{r.comment}&rdquo;
                              </blockquote>
                            )}
                            <figcaption className="mt-4 flex items-center gap-3 border-t border-border pt-3.5">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-xs font-extrabold text-on-primary">
                                {r.author.slice(0, 1).toUpperCase()}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold">{r.author}</span>
                                {prod ? (
                                  <Link
                                    to={`/product/${prod.slug}`}
                                    className="block truncate text-xs font-semibold text-primary-400 hover:underline"
                                  >
                                    on {prod.name}
                                  </Link>
                                ) : (
                                  <span className="block text-xs text-foreground/45">Verified purchase</span>
                                )}
                              </span>
                            </figcaption>
                          </figure>
                        </Reveal>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== Blog preview ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Guides &amp; news</p>
            <h2 className="section-title mt-3">From the journal</h2>
            <p className="section-lead">Bought your first cue? Now learn to keep it sharp.</p>
          </div>
          <Link to="/blog" className="btn btn-ghost whitespace-nowrap text-sm">
            All posts <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>

        <ul className="grid gap-6 md:grid-cols-3">
          {posts.filter((p) => p.published).slice(0, 3).map((post, i) => (
            <li key={post.slug}>
              <Reveal delay={i * 80} className="h-full">
                <Link to={`/blog/${post.slug}`} className="card lift group flex h-full flex-col overflow-hidden transition-colors duration-300 hover:border-gold-400/50">
                  <div className="relative aspect-[16/10] overflow-hidden bg-foreground/10">
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                    />
                    <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-primary-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-200 backdrop-blur">
                      {post.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-5">
                    <h3 className="font-heading text-lg font-bold leading-snug transition-colors duration-150 group-hover:text-gold-600">
                      {post.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-foreground/60">{post.excerpt}</p>
                    <p className="mt-auto flex items-center justify-between border-t border-border/70 pt-3 text-xs font-semibold text-foreground/45">
                      <span>{formatDate(post.date)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {post.readMinutes} min read
                      </span>
                    </p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ===== Newsletter ===== */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-900 via-primary-950 to-primary-950 px-6 py-12 text-on-primary shadow-lift ring-1 ring-gold-400/20 sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute inset-0 nav-grid opacity-40" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-primary-400/20 blur-3xl" aria-hidden="true" />

            <div className="relative mx-auto max-w-2xl text-center">
              <p className="eyebrow-on-dark justify-center">Members-only perks</p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                Cue tips, straight to your inbox
              </h2>
              <p className="mt-3 text-sm text-on-primary/75 sm:text-base">
                One email a month: buying guides, table care, and member-only deals. No spam, ever.
              </p>

              {subscribed ? (
                <p className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-gold-300/30 bg-gold-400/15 px-5 py-3 text-sm font-semibold text-gold-200">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  You&apos;re in! Watch your inbox for the first issue.
                </p>
              ) : (
                <form
                  className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email.trim()) setSubscribed(true);
                  }}
                >
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-dark flex-1"
                  />
                  <button type="submit" className="btn btn-accent shrink-0">
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}