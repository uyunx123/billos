import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CATEGORIES } from "../data/products";
import { POSTS } from "../data/posts";
import { SPONSORS } from "../data/sponsors";
import { BRAND_LOGO } from "../lib/logo";
import { supabase } from "../lib/supabase";
import { slugify } from "./StoreContext";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PaymentGateway {
  id: string;
  name: string;
  enabled: boolean;
}

export interface CategoryConfig {
  id: string;
  name: string;
  blurb: string;
  image: string;
  enabled: boolean;
  builtIn: boolean;
}

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  content: string; // paragraphs separated by blank lines
  enabled: boolean;
}

export type SponsorPlacement = "home_hero" | "shop_bottom" | "footer";

export interface SponsorConfig {
  id: string;
  name: string;
  tagline?: string;
  placement: SponsorPlacement;
  /** data URL (uploaded) or a /placeholders/… path. */
  image: string;
  /** Optional external link — sanitized on render (http(s)/whatsapp/tel only). */
  externalUrl?: string;
  /** Optional link into the shop (product id) instead of an external URL. */
  productId?: string;
  enabled: boolean;
}

/**
 * A partner logo on the homepage "In partnership with" strip.
 * Managed in the admin console (Partnerships) and rendered on the homepage.
 */
export interface PartnerConfig {
  id: string;
  /** Display name on the homepage pill. */
  name: string;
  /** Landing URL — sanitized on render (http(s)/mailto/tel/whatsapp or a site path). */
  url: string;
  /** Logo path (e.g. /sponsors/predator.svg) or an external image URL. Empty = gold placeholder. */
  image?: string;
  /** Show on the homepage strip. */
  active: boolean;
  /** Feature as a "Main sponsor" — biggest logos, ahead of the partner list. */
  isMain: boolean;
}

export type TickerLabelStyle = "featured" | "big_sale" | "custom";

export interface TickerItem {
  id: string;
  /** Chip style: featured (gold), big_sale (red) or custom (neutral, free text). */
  labelStyle: TickerLabelStyle;
  /** Chip text — required when labelStyle === "custom". */
  label?: string;
  /** The announcement copy shown on the ticker. */
  text: string;
  /** Optional deep link into the site (blog post or product). */
  linkType?: "blog" | "product";
  linkSlug?: string;
  enabled: boolean;
}

export interface TickerConfig {
  /** Master switch for the sticky bottom bar. */
  enabled: boolean;
  /** Seconds for one full marquee pass — lower = faster. */
  speed: number;
  items: TickerItem[];
}

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "x"
  | "whatsapp"
  | "shopee"
  | "tokopedia"
  | "website";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  enabled: boolean;
}

export interface ShopLink {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
}

export interface HeroConfig {
  /** Badge pill above the headline, e.g. "ISAK Billiard Co. — Jakarta". */
  badge: string;
  /** First main line of the headline (strong). */
  titleLine1: string;
  /** Second main line of the headline (italic gold gradient). */
  titleLine2: string;
  /** Supporting paragraph under the headline. */
  text: string;
  /** Hero carousel photos — the first one is the primary image. */
  images: string[];
}

export interface SiteConfig {
  /** Homepage hero copy + photos, editable in the admin console. */
  hero: HeroConfig;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  /** Google Maps embed src (https, rendered in an iframe on the contact page). */
  mapEmbedUrl: string;
  /** Announcement bar text — `{threshold}` is replaced with the free-shipping amount. */
  announcement: string;
  socials: SocialLink[];
  shopLinks: ShopLink[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  image: string;
  content: string[];
  readMinutes: number;
  videoUrl?: string;
  published: boolean;
}

/* ------------------------------------------------------------------ */
/* Defaults + persistence helpers                                      */
/* ------------------------------------------------------------------ */

const GATEWAYS_KEY = "isak-config-gateways-v1";
const CATEGORIES_KEY = "isak-config-categories-v1";
const PAGES_KEY = "isak-config-pages-v1";
const SPONSORS_KEY = "isak-config-sponsors-v1";
const PARTNERS_KEY = "isak-config-partners-v1";
const SITE_KEY = "isak-config-site-v1";
const POSTS_KEY = "isak-config-posts-v1";
const LOGO_KEY = "isak-config-logo-v1";
const TICKER_KEY = "isak-config-ticker-v1";

export const DEFAULT_GATEWAYS: PaymentGateway[] = [
  { id: "qris", name: "QRIS (all e-wallets & bank apps)", enabled: true },
  { id: "va", name: "Virtual Account (BCA, BNI, BRI)", enabled: true },
  { id: "ewallet", name: "e-Wallet (GoPay, OVO, ShopeePay)", enabled: true },
  { id: "card", name: "Credit / Debit card", enabled: true },
];

export const DEFAULT_CATEGORIES: CategoryConfig[] = CATEGORIES.map((c) => ({
  ...c,
  enabled: true,
  builtIn: true,
}));

export const DEFAULT_PAGES: SitePage[] = [
  {
    id: "page-about",
    slug: "about",
    title: "About us",
    enabled: true,
    content: [
      "ISAK Billiard Co. started in 2016 as a single rack of loaner cues at a back-street club in Jakarta. Word spread, and what began as 'the guy who can source any cue' grew into the capital's dedicated billiard equipment house — competition cues and shafts from the household names of the game, slate tables, balls, gloves and the table-side gear that keeps a game honest.",
      "We kit out league clubs, hotel game rooms and home garages across the archipelago. Every order is packed cue-by-cue — tips shielded, shafts wrapped, tables strapped — with honest stock levels and a 7-day return window so what arrives is exactly what you saw on the page.",
      "Our showroom at Jalan Rasuna Said Kav. 7 is open for test swings — bring your favourite cue and stay for a rack. Prefer to shop from home? Our official Shopee and Tokopedia stores carry the same stock, with the same packing standard and the same after-sales care.",
      "Whether it's your first stick or your fifth podium, we treat every purchase like it's going on a trophy shelf — because that's where the good ones end up.",
    ].join("\n\n"),
  },
  {
    id: "page-terms",
    slug: "terms",
    title: "Terms of Service",
    enabled: true,
    content: [
      "Orders. Payment is collected at checkout using the methods shown on the payment page. A confirmed order reserves stock while we pack and hand it to the courier.",
      "Shipping. Delivery runs with JNE, J&T Express and SiCepat, and every order gets a tracking link by email or phone. Orders at or above the free-shipping threshold shown in the shop ship free.",
      "Returns. Items can be returned within 7 days of delivery, unused and in original packaging. Tables and custom setup services are exempt from returns.",
    ].join("\n\n"),
  },
  {
    id: "page-privacy",
    slug: "privacy",
    title: "Privacy Policy",
    enabled: true,
    content: [
      "We only keep what we need to fulfil an order: your name, address, phone and email. We never sell or share your details with anyone else.",
      "This demo store keeps its data in your browser so it can run without a server. A production deployment stores customer data in an encrypted database with proper access controls.",
    ].join("\n\n"),
  },
  {
    id: "page-shipping",
    slug: "shipping-returns",
    title: "Shipping & Returns",
    enabled: true,
    content: [
      "Shipping. Every order ships nationwide with JNE, J&T Express and SiCepat, and you get a tracking link by email or phone as soon as it leaves us. Orders at or above the free-shipping threshold shown in the shop ship free — below it, a flat base fee plus a small per-kilogram charge applies.",
      "Packing. Cues are packed tip-shielded and shaft-wrapped, tables are strapped on pallets, and balls arrive in their original box inside a second protective layer. We photograph high-value parcels before dispatch.",
      "Returns. Unused items in original packaging can be returned within 7 days of delivery for a refund or exchange. Tables and custom installation services are exempt. To start a return, message us via the contact page with your order number — we reply within one business day.",
      "Refunds. Approved returns are refunded to your original payment method within 5–7 business days of the item arriving back at our showroom.",
    ].join("\n\n"),
  },
];

export const SPONSOR_PLACEMENTS: { id: SponsorPlacement; label: string }[] = [
  { id: "home_hero", label: "Home — under the hero" },
  { id: "shop_bottom", label: "Shop — below the grid" },
  { id: "footer", label: "Footer — above the legal bar" },
];

export const SOCIAL_CATALOG: { id: SocialPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X (Twitter)" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "shopee", label: "Shopee" },
  { id: "tokopedia", label: "Tokopedia" },
  { id: "website", label: "Website" },
];

export const DEFAULT_HERO: HeroConfig = {
  badge: "ISAK Billiard Co. — Jakarta",
  titleLine1: "Play serious.",
  titleLine2: "Gear smarter.",
  text: "Tournament cues, felt-fresh tables and gear engineered to last — with honest advice from people who actually play.",
  images: [
    "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/cue.jpg",
    "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/table.jpg",
    "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/balls.jpg",
    "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/accessories.jpg",
    "https://fsromwbocphdsnrrtytc.supabase.co/storage/v1/object/public/products/glove.jpg",
  ],
};

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  hero: DEFAULT_HERO,
  phone: "+62 21 555 0123",
  whatsapp: "+62 812 3456 7890",
  email: "hallo@isakbilliard.co.id",
  address: "Jl. Jend. Sudirman Kav. 12, Jakarta 10220",
  hours: "Showroom: Mon–Sat 10:00–20:00 · Online orders: 24/7",
  mapEmbedUrl: "https://www.google.com/maps?q=Jl.Jend.Sudirman%20Jakarta&output=embed",
  announcement: "Official store on Shopee & Tokopedia — free shipping above {threshold}",
  socials: [
    { id: "social-instagram", platform: "instagram", label: "Instagram", url: "https://instagram.com/isakbilliard", enabled: true },
    { id: "social-tiktok", platform: "tiktok", label: "TikTok", url: "https://tiktok.com/@isakbilliard", enabled: true },
    { id: "social-youtube", platform: "youtube", label: "YouTube", url: "https://youtube.com/@isakbilliard", enabled: true },
    { id: "social-facebook", platform: "facebook", label: "Facebook", url: "https://facebook.com/isakbilliard", enabled: true },
  ],
  shopLinks: [
    { id: "shop-shopee", label: "Shopee", url: "https://shopee.co.id/", enabled: true },
    { id: "shop-tokopedia", label: "Tokopedia", url: "https://www.tokopedia.com/", enabled: true },
  ],
};

/** Partner ids that are "Main sponsor" by default (biggest logos up top). */
const DEFAULT_MAIN_SPONSOR_IDS = new Set(["predator", "murrey", "aramith"]);

/** Default partner line-up — the homepage "In partnership with" strip. */
export const DEFAULT_PARTNERS: PartnerConfig[] = SPONSORS.map((s) => ({
  id: s.id,
  name: s.name,
  url: s.href,
  image: s.image ?? "",
  active: s.active,
  isMain: DEFAULT_MAIN_SPONSOR_IDS.has(s.id),
}));

/**
 * Default newsticker — the sticky bottom marquee. Content-pickable in the
 * admin console (search & insert blog posts / products).
 */
export const DEFAULT_TICKER: TickerConfig = {
  enabled: true,
  speed: 24,
  items: [
    {
      id: "tick-1",
      labelStyle: "big_sale",
      text: "Mid-season sale — up to 30% off tables & ball sets",
      enabled: true,
    },
    {
      id: "tick-2",
      labelStyle: "featured",
      text: "Predator Avant Garde Ebony LE is back in stock",
      linkType: "product",
      linkSlug: "predator-avant-garde-ebony-le",
      enabled: true,
    },
    {
      id: "tick-3",
      labelStyle: "featured",
      text: "New guide: how to choose your first cue",
      linkType: "blog",
      linkSlug: "choose-your-first-cue",
      enabled: true,
    },
    {
      id: "tick-4",
      labelStyle: "custom",
      label: "Tip of the week",
      text: "Scuff your tip after every long session — English bites better",
      enabled: true,
    },
  ],
};

/** Backfill isMain on older stored partners without the flag. */
function normalizePartners(stored: PartnerConfig[]): PartnerConfig[] {
  if (!Array.isArray(stored)) return DEFAULT_PARTNERS.map((p) => ({ ...p }));
  return stored.map((p) => ({
    ...p,
    isMain:
      typeof p.isMain === "boolean"
        ? p.isMain
        : DEFAULT_PARTNERS.find((d) => d.id === p.id)?.isMain ?? false,
  }));
}

/** Normalise stored ticker config against the defaults (fills in new fields). */
function normalizeTicker(stored: TickerConfig | null | undefined): TickerConfig {
  const base = DEFAULT_TICKER;
  if (!stored || typeof stored !== "object") return { ...base, items: base.items.map((i) => ({ ...i })) };
  const speed = Math.min(90, Math.max(10, Number(stored.speed) || base.speed));
  const items = Array.isArray(stored.items) ? stored.items : [];
  return {
    enabled: typeof stored.enabled === "boolean" ? stored.enabled : base.enabled,
    speed,
    items: items
      .map((it) => ({
        id: typeof it.id === "string" && it.id ? it.id : `tick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        labelStyle: it.labelStyle === "custom" || it.labelStyle === "big_sale" || it.labelStyle === "featured" ? it.labelStyle : "featured",
        label: typeof it.label === "string" && it.label.trim() ? it.label : undefined,
        text: typeof it.text === "string" ? it.text : "",
        linkType: it.linkType === "blog" || it.linkType === "product" ? it.linkType : undefined,
        linkSlug: typeof it.linkSlug === "string" && it.linkSlug ? it.linkSlug : undefined,
        enabled: typeof it.enabled === "boolean" ? it.enabled : true,
      }))
      .filter((it) => it.text.trim()),
  };
}

export const DEFAULT_POSTS: BlogPost[] = POSTS.map((p) => ({
  ...p,
  published: true,
}));

/* ------------------------------------------------------------------ */
/* Supabase persistence (single-row site config bundle)                */
/* ------------------------------------------------------------------ */

/** The whole admin-editable config, persisted as one `site_config` row. */
export interface PersistedConfigBundle {
  gateways?: PaymentGateway[];
  categories?: CategoryConfig[];
  pages?: SitePage[];
  sponsors?: SponsorConfig[];
  partners?: PartnerConfig[];
  siteConfig?: Partial<SiteConfig>;
  posts?: BlogPost[];
  logo?: string;
  ticker?: TickerConfig;
}

const SITE_CONFIG_ROW_ID = "1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — demo only */
  }
}

function normalizeHero(stored: Partial<HeroConfig> | null | undefined): HeroConfig {
  const base = DEFAULT_HERO;
  const images =
    stored?.images && Array.isArray(stored.images) && stored.images.length > 0
      ? stored.images
      : base.images;
  return {
    badge: stored?.badge ?? base.badge,
    titleLine1: stored?.titleLine1 ?? base.titleLine1,
    titleLine2: stored?.titleLine2 ?? base.titleLine2,
    text: stored?.text ?? base.text,
    images,
  };
}

/** Normalise stored site config against the defaults (fills in new fields). */
function normalizeSiteConfig(stored: Partial<SiteConfig> | null): SiteConfig {
  const base = DEFAULT_SITE_CONFIG;
  if (!stored || typeof stored !== "object") return base;
  return {
    hero: normalizeHero(stored.hero && typeof stored.hero === "object" ? stored.hero : undefined),
    phone: stored.phone ?? base.phone,
    whatsapp: stored.whatsapp ?? base.whatsapp,
    email: stored.email ?? base.email,
    address: stored.address ?? base.address,
    hours: stored.hours ?? base.hours,
    mapEmbedUrl: stored.mapEmbedUrl ?? base.mapEmbedUrl,
    announcement: stored.announcement ?? base.announcement,
    socials: Array.isArray(stored.socials) ? stored.socials : base.socials,
    shopLinks: Array.isArray(stored.shopLinks) ? stored.shopLinks : base.shopLinks,
  };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface ConfigContextValue {
  paymentGateways: PaymentGateway[];
  addPaymentGateway: (g: Pick<PaymentGateway, "name"> & Partial<PaymentGateway>) => void;
  updatePaymentGateway: (id: string, patch: Partial<PaymentGateway>) => void;
  deletePaymentGateway: (id: string) => void;
  categories: CategoryConfig[];
  addCategory: (c: Pick<CategoryConfig, "name"> & Partial<CategoryConfig>) => void;
  updateCategory: (id: string, patch: Partial<CategoryConfig>) => void;
  deleteCategory: (id: string) => void;
  pages: SitePage[];
  addPage: (p: Pick<SitePage, "title"> & Partial<SitePage>) => SitePage | null;
  updatePage: (id: string, patch: Partial<SitePage>) => void;
  deletePage: (id: string) => void;
  sponsors: SponsorConfig[];
  addSponsor: (s: Pick<SponsorConfig, "name" | "placement" | "image"> & Partial<SponsorConfig>) => void;
  updateSponsor: (id: string, patch: Partial<SponsorConfig>) => void;
  deleteSponsor: (id: string) => void;
  getSponsorForPlacement: (placement: SponsorPlacement) => SponsorConfig | undefined;
  /* ---- homepage partner strip ---- */
  partners: PartnerConfig[];
  addPartner: (p: Pick<PartnerConfig, "name" | "url"> & Partial<PartnerConfig>) => void;
  updatePartner: (id: string, patch: Partial<PartnerConfig>) => void;
  deletePartner: (id: string) => void;
  /** Move a partner up/down the homepage strip (dir: -1 up, +1 down). */
  movePartner: (id: string, dir: -1 | 1) => void;
  /** Restore the default partner line-up (used by the admin console). */
  resetPartners: () => void;
  /* ---- site settings (contact, socials, shop links, branding) ---- */
  siteConfig: SiteConfig;
  updateSiteConfig: (patch: Partial<SiteConfig>) => void;
  addSocialLink: (s: Pick<SocialLink, "platform" | "label" | "url">) => void;
  updateSocialLink: (id: string, patch: Partial<SocialLink>) => void;
  deleteSocialLink: (id: string) => void;
  addShopLink: (s: Pick<ShopLink, "label" | "url">) => void;
  updateShopLink: (id: string, patch: Partial<ShopLink>) => void;
  deleteShopLink: (id: string) => void;
  /* ---- journal / blog posts ---- */
  posts: BlogPost[];
  addPost: (p: Pick<BlogPost, "title" | "content"> & Partial<BlogPost>) => BlogPost | null;
  updatePost: (slug: string, patch: Partial<BlogPost>) => void;
  deletePost: (slug: string) => void;
  /* ---- logo / icon ---- */
  logo: string;
  updateLogo: (next: string) => void;
  /* ---- newsticker (sticky bottom bar) ---- */
  ticker: TickerConfig;
  updateTicker: (patch: Partial<TickerConfig>) => void;
  addTickerItem: (item: Pick<TickerItem, "text"> & Partial<TickerItem>) => void;
  updateTickerItem: (id: string, patch: Partial<TickerItem>) => void;
  deleteTickerItem: (id: string) => void;
  resetTicker: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>(() =>
    readJson(GATEWAYS_KEY, DEFAULT_GATEWAYS)
  );
  const [categories, setCategories] = useState<CategoryConfig[]>(() =>
    readJson(CATEGORIES_KEY, DEFAULT_CATEGORIES)
  );
  const [pages, setPages] = useState<SitePage[]>(() => readJson(PAGES_KEY, DEFAULT_PAGES));
  const [sponsors, setSponsors] = useState<SponsorConfig[]>(() =>
    readJson(SPONSORS_KEY, [] as SponsorConfig[])
  );
  const [partners, setPartners] = useState<PartnerConfig[]>(() =>
    normalizePartners(readJson<PartnerConfig[]>(PARTNERS_KEY, DEFAULT_PARTNERS))
  );
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() =>
    normalizeSiteConfig(readJson<Partial<SiteConfig> | null>(SITE_KEY, null))
  );
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    const stored = readJson<BlogPost[]>(POSTS_KEY, []);
    if (stored.length === 0) return DEFAULT_POSTS;
    return stored.map((p) => ({ ...p, published: p.published ?? true }));
  });
  const [logo, setLogo] = useState<string>(() => readJson<string>(LOGO_KEY, BRAND_LOGO));
  const [ticker, setTicker] = useState<TickerConfig>(() =>
    normalizeTicker(readJson<TickerConfig | null>(TICKER_KEY, null))
  );

  useEffect(() => writeJson(GATEWAYS_KEY, paymentGateways), [paymentGateways]);
  useEffect(() => writeJson(CATEGORIES_KEY, categories), [categories]);
  useEffect(() => writeJson(PAGES_KEY, pages), [pages]);
  useEffect(() => writeJson(SPONSORS_KEY, sponsors), [sponsors]);
  useEffect(() => writeJson(PARTNERS_KEY, partners), [partners]);
  useEffect(() => writeJson(SITE_KEY, siteConfig), [siteConfig]);
  useEffect(() => writeJson(POSTS_KEY, posts), [posts]);
  useEffect(() => writeJson(LOGO_KEY, logo), [logo]);
  useEffect(() => writeJson(TICKER_KEY, ticker), [ticker]);

  /* ---------------- Supabase sync (admin config bundle) ---------------- */
  const hydratedRef = useRef(false);

  // Hydrate once on mount — the stored bundle wins over the local defaults,
  // so admin edits persist across devices. Falls back silently to the
  // localStorage defaults when Supabase is unreachable.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) {
        hydratedRef.current = true;
        return;
      }
      const { data, error } = await supabase
        .from("site_config")
        .select("config")
        .eq("id", SITE_CONFIG_ROW_ID)
        .maybeSingle();
      if (!alive) return;
      if (!error && data?.config && typeof data.config === "object") {
        const bundle = data.config as PersistedConfigBundle;
        if (Array.isArray(bundle.gateways)) setPaymentGateways(bundle.gateways);
        if (Array.isArray(bundle.categories)) setCategories(bundle.categories);
        if (Array.isArray(bundle.pages)) setPages(bundle.pages);
        if (Array.isArray(bundle.sponsors)) setSponsors(bundle.sponsors);
        if (Array.isArray(bundle.partners)) setPartners(normalizePartners(bundle.partners));
        if (bundle.siteConfig && typeof bundle.siteConfig === "object") {
          setSiteConfig(normalizeSiteConfig(bundle.siteConfig));
        }
        if (Array.isArray(bundle.posts) && bundle.posts.length > 0) {
          setPosts(bundle.posts.map((p) => ({ ...p, published: p.published ?? true })));
        }
        if (typeof bundle.logo === "string" && bundle.logo) setLogo(bundle.logo);
        if (bundle.ticker && typeof bundle.ticker === "object") {
          setTicker(normalizeTicker(bundle.ticker as TickerConfig));
        }
      }
      hydratedRef.current = true;
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Write-through: after hydration settles, mirror the whole bundle back to
  // Supabase (debounced so rapid edits batch into one upsert).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const db = supabase; // local const — TS null-check survives the closure
    if (!db) return;
    const t = window.setTimeout(() => {
      const bundle: PersistedConfigBundle = {
        gateways: paymentGateways,
        categories,
        pages,
        sponsors,
        partners,
        siteConfig,
        posts,
        logo,
        ticker,
      };
      void db
        .from("site_config")
        .upsert({ id: SITE_CONFIG_ROW_ID, config: bundle }, { onConflict: "id" })
        .then(
          () => undefined,
          () => undefined
        );
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentGateways, categories, pages, sponsors, partners, siteConfig, posts, logo, ticker, hydratedRef.current]);

  /* -------------------- payment gateways -------------------- */

  const addPaymentGateway = useCallback(
    (g: Pick<PaymentGateway, "name"> & Partial<PaymentGateway>) => {
      setPaymentGateways((prev) => [
        ...prev,
        { id: `gw-${Date.now().toString(36)}`, name: g.name, enabled: g.enabled ?? true },
      ]);
    },
    []
  );

  const updatePaymentGateway = useCallback((id: string, patch: Partial<PaymentGateway>) => {
    setPaymentGateways((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }, []);

  const deletePaymentGateway = useCallback((id: string) => {
    setPaymentGateways((prev) => prev.filter((g) => g.id !== id));
  }, []);

  /* -------------------- categories -------------------- */

  const addCategory = useCallback(
    (c: Pick<CategoryConfig, "name"> & Partial<CategoryConfig>) => {
      const base = slugify(c.name) || "category";
      let id = base;
      let i = 2;
      // Ensure a unique id against the current list.
      setCategories((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        while (ids.has(id)) {
          id = `${base}-${i}`;
          i += 1;
        }
        return [
          ...prev,
          {
            id,
            name: c.name.trim(),
            blurb: c.blurb ?? "Products in this range",
            image: c.image ?? "",
            enabled: c.enabled ?? true,
            builtIn: false,
          },
        ];
      });
    },
    []
  );

  const updateCategory = useCallback((id: string, patch: Partial<CategoryConfig>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /* -------------------- pages -------------------- */

  const uniqueSlug = useCallback((base: string, excludeId?: string | null): string => {
    let slug = slugify(base) || "page";
    let i = 2;
    const taken = (s: string) => pages.some((p) => p.slug === s && p.id !== excludeId);
    while (taken(slug)) {
      slug = `${slugify(base) || "page"}-${i}`;
      i += 1;
    }
    return slug;
  }, [pages]);

  const addPage = useCallback(
    (p: Pick<SitePage, "title"> & Partial<SitePage>): SitePage | null => {
      const title = p.title.trim();
      if (!title) return null;
      const slug = uniqueSlug(p.slug ?? p.title, null);
      const page: SitePage = {
        id: p.id ?? `page-${Date.now().toString(36)}`,
        slug,
        title,
        content: p.content ?? "",
        enabled: p.enabled ?? true,
      };
      setPages((prev) => [...prev, page]);
      return page;
    },
    [uniqueSlug]
  );

  const updatePage = useCallback((id: string, patch: Partial<SitePage>) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deletePage = useCallback((id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /* -------------------- sponsors -------------------- */

  const addSponsor = useCallback(
    (s: Pick<SponsorConfig, "name" | "placement" | "image"> & Partial<SponsorConfig>) => {
      setSponsors((prev) => [
        ...prev,
        {
          id: `sponsor-${Date.now().toString(36)}`,
          name: s.name.trim(),
          tagline: s.tagline?.trim() || undefined,
          placement: s.placement,
          image: s.image,
          externalUrl: s.externalUrl?.trim() || undefined,
          productId: s.productId || undefined,
          enabled: s.enabled ?? true,
        },
      ]);
    },
    []
  );

  const updateSponsor = useCallback((id: string, patch: Partial<SponsorConfig>) => {
    setSponsors((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteSponsor = useCallback((id: string) => {
    setSponsors((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getSponsorForPlacement = useCallback(
    (placement: SponsorPlacement) =>
      sponsors.find((s) => s.placement === placement && s.enabled),
    [sponsors]
  );

  /* -------------------- homepage partner strip -------------------- */

  const addPartner = useCallback(
    (p: Pick<PartnerConfig, "name" | "url"> & Partial<PartnerConfig>) => {
      setPartners((prev) => [
        ...prev,
        {
          id: `partner-${Date.now().toString(36)}`,
          name: p.name.trim(),
          url: p.url.trim(),
          image: p.image?.trim() || "",
          active: p.active ?? true,
          isMain: p.isMain ?? false,
        },
      ]);
    },
    []
  );

  const updatePartner = useCallback((id: string, patch: Partial<PartnerConfig>) => {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deletePartner = useCallback((id: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const movePartner = useCallback((id: string, dir: -1 | 1) => {
    setPartners((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const resetPartners = useCallback(() => {
    // Fresh references so reordering/editing never mutates the defaults.
    setPartners(DEFAULT_PARTNERS.map((p) => ({ ...p })));
  }, []);

  /* -------------------- site settings -------------------- */

  const updateSiteConfig = useCallback((patch: Partial<SiteConfig>) => {
    setSiteConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const addSocialLink = useCallback(
    (s: Pick<SocialLink, "platform" | "label" | "url">) => {
      setSiteConfig((prev) => ({
        ...prev,
        socials: [
          ...prev.socials,
          {
            id: `social-${Date.now().toString(36)}`,
            platform: s.platform,
            label:
              s.label.trim() ||
              (SOCIAL_CATALOG.find((c) => c.id === s.platform)?.label ?? s.platform),
            url: s.url.trim(),
            enabled: true,
          },
        ],
      }));
    },
    []
  );

  const updateSocialLink = useCallback((id: string, patch: Partial<SocialLink>) => {
    setSiteConfig((prev) => ({
      ...prev,
      socials: prev.socials.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const deleteSocialLink = useCallback((id: string) => {
    setSiteConfig((prev) => ({ ...prev, socials: prev.socials.filter((s) => s.id !== id) }));
  }, []);

  const addShopLink = useCallback((s: Pick<ShopLink, "label" | "url">) => {
    setSiteConfig((prev) => ({
      ...prev,
      shopLinks: [
        ...prev.shopLinks,
        { id: `shop-${Date.now().toString(36)}`, label: s.label.trim(), url: s.url.trim(), enabled: true },
      ],
    }));
  }, []);

  const updateShopLink = useCallback((id: string, patch: Partial<ShopLink>) => {
    setSiteConfig((prev) => ({
      ...prev,
      shopLinks: prev.shopLinks.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  }, []);

  const deleteShopLink = useCallback((id: string) => {
    setSiteConfig((prev) => ({ ...prev, shopLinks: prev.shopLinks.filter((s) => s.id !== id) }));
  }, []);

  /* -------------------- journal posts -------------------- */

  const addPost = useCallback(
    (p: Pick<BlogPost, "title" | "content"> & Partial<BlogPost>): BlogPost | null => {
      const title = p.title.trim();
      if (!title) return null;
      const base = slugify(p.slug ?? title) || "post";
      let slug = base;
      let i = 2;
      while (posts.some((x) => x.slug === slug)) {
        slug = `${base}-${i}`;
        i += 1;
      }
      const content = Array.isArray(p.content) ? p.content.filter((s) => s.trim()) : [];
      const post: BlogPost = {
        slug,
        title,
        excerpt: p.excerpt?.trim() ?? "",
        author: p.author?.trim() ?? "ISAK Billiard Co.",
        date: p.date ?? new Date().toISOString().slice(0, 10),
        category: p.category?.trim() ?? "Journal",
        image: p.image ?? "/placeholders/cue.svg",
        content,
        readMinutes: p.readMinutes ?? Math.max(1, Math.round(content.join(" ").length / 900)),
        videoUrl: p.videoUrl?.trim() || undefined,
        published: p.published ?? true,
      };
      setPosts((prev) => [post, ...prev]);
      return post;
    },
    [posts]
  );

  const updatePost = useCallback((slug: string, patch: Partial<BlogPost>) => {
    setPosts((prev) => prev.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));
  }, []);

  const deletePost = useCallback((slug: string) => {
    setPosts((prev) => prev.filter((p) => p.slug !== slug));
  }, []);

  /* -------------------- logo -------------------- */

  const updateLogo = useCallback((next: string) => {
    const clean = next.trim();
    // Accept uploaded data URLs, site paths and http(s) image URLs only.
    if (
      clean.startsWith("data:image/") ||
      clean.startsWith("/") ||
      clean.startsWith("http://") ||
      clean.startsWith("https://")
    ) {
      setLogo(clean);
    }
  }, []);

  /* -------------------- newsticker -------------------- */

  const updateTicker = useCallback((patch: Partial<TickerConfig>) => {
    setTicker((prev) => normalizeTicker({ ...prev, ...patch }));
  }, []);

  const addTickerItem = useCallback(
    (item: Pick<TickerItem, "text"> & Partial<TickerItem>) => {
      const text = item.text.trim();
      if (!text) return;
      setTicker((prev) =>
        normalizeTicker({
          ...prev,
          items: [
            ...prev.items,
            {
              id: item.id ?? `tick-${Date.now().toString(36)}`,
              labelStyle: item.labelStyle ?? "featured",
              label: item.label?.trim() || undefined,
              text,
              linkType: item.linkType,
              linkSlug: item.linkSlug?.trim() || undefined,
              enabled: item.enabled ?? true,
            },
          ],
        })
      );
    },
    []
  );

  const updateTickerItem = useCallback((id: string, patch: Partial<TickerItem>) => {
    setTicker((prev) =>
      normalizeTicker({
        ...prev,
        items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      })
    );
  }, []);

  const deleteTickerItem = useCallback((id: string) => {
    setTicker((prev) => normalizeTicker({ ...prev, items: prev.items.filter((it) => it.id !== id) }));
  }, []);

  const resetTicker = useCallback(() => {
    setTicker(DEFAULT_TICKER);
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({
      paymentGateways,
      addPaymentGateway,
      updatePaymentGateway,
      deletePaymentGateway,
      categories,
      addCategory,
      updateCategory,
      deleteCategory,
      pages,
      addPage,
      updatePage,
      deletePage,
      sponsors,
      addSponsor,
      updateSponsor,
      deleteSponsor,
      getSponsorForPlacement,
      siteConfig,
      updateSiteConfig,
      addSocialLink,
      updateSocialLink,
      deleteSocialLink,
      addShopLink,
      updateShopLink,
      deleteShopLink,
      posts,
      addPost,
      updatePost,
      deletePost,
      partners,
      addPartner,
      updatePartner,
      deletePartner,
      movePartner,
      resetPartners,
      logo,
      updateLogo,
      ticker,
      updateTicker,
      addTickerItem,
      updateTickerItem,
      deleteTickerItem,
      resetTicker,
    }),
    [
      paymentGateways,
      addPaymentGateway,
      updatePaymentGateway,
      deletePaymentGateway,
      categories,
      addCategory,
      updateCategory,
      deleteCategory,
      pages,
      addPage,
      updatePage,
      deletePage,
      sponsors,
      addSponsor,
      updateSponsor,
      deleteSponsor,
      getSponsorForPlacement,
      siteConfig,
      updateSiteConfig,
      addSocialLink,
      updateSocialLink,
      deleteSocialLink,
      addShopLink,
      updateShopLink,
      deleteShopLink,
      posts,
      addPost,
      updatePost,
      deletePost,
      partners,
      addPartner,
      updatePartner,
      deletePartner,
      movePartner,
      resetPartners,
      logo,
      updateLogo,
      ticker,
      updateTicker,
      addTickerItem,
      updateTickerItem,
      deleteTickerItem,
      resetTicker,
    ]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}