import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Home,
  Check,
  EyeOff,
  FileText,
  ImagePlus,
  LayoutDashboard,
  Lock,
  LogIn,
  MapPin,
  Megaphone,
  MessageSquare,
  Minus,
  Newspaper,
  Package as PackageIcon,
  PackagePlus,
  Palette,
  Pencil,
  PlugZap,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Ticket,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useCoupons, normalizeCode, type Coupon, type CouponType, type NewCoupon } from "../context/CouponContext";
import { useReceipts, type ReceiptSettingsConfig } from "../context/ReceiptContext";
import {
  useStore,
  slugify,
  canTransition,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type ShippingMethod,
} from "../context/StoreContext";
import {
  useConfig,
  DEFAULT_HERO,
  SOCIAL_CATALOG,
  SPONSOR_PLACEMENTS,
  type BlogPost,
  type CategoryConfig,
  type HeroConfig,
  type ShopLink,
  type SitePage,
  type SocialLink,
  type SocialPlatform,
  type SponsorPlacement,
} from "../context/ConfigContext";
import { useGateways } from "../context/GatewayContext";
import { GATEWAY_CATALOG, GATEWAY_TYPE_LABEL, type GatewayCatalogEntry } from "../data/gatewayCatalog";
import GatewayWizard from "../components/GatewayWizard";
import SocialPlatformIcon from "../components/SocialIcon";
import ReviewModal from "../components/ReviewModal";
import { BRAND_LOGO } from "../lib/logo";
import { type CategoryId, type Product } from "../data/products";
import { useReviews, type ProductReview } from "../context/ReviewContext";
import { formatIDR } from "../lib/format";
import OrderTimeline from "../components/OrderTimeline";

type Tab = "overview" | "products" | "stock" | "shipping" | "orders" | "reviews" | "chat" | "users" | "config";

const TABS: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: PackageIcon },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "orders", label: "Orders", icon: ReceiptText },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "users", label: "Users", icon: Users },
  { id: "config", label: "Configuration", icon: Settings2 },
];

const IMAGE_OPTIONS = [
  "/placeholders/cue.svg",
  "/placeholders/carbon.svg",
  "/placeholders/balls.svg",
  "/placeholders/table.svg",
  "/placeholders/accessories.svg",
  "/placeholders/glove.svg",
  "/placeholders/apparel.svg",
  "/placeholders/light.svg",
];

interface ProductFormState {
  name: string;
  category: CategoryId;
  price: string;
  compareAt: string;
  discountPct: string;
  freeShipping: boolean;
  stock: string;
  weightGrams: string;
  image: string;
  blurb: string;
  description: string;
  featured: boolean;
  videoUrl: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  category: "cues",
  price: "",
  compareAt: "",
  discountPct: "",
  freeShipping: false,
  stock: "0",
  weightGrams: "500",
  image: IMAGE_OPTIONS[0],
  blurb: "",
  description: "",
  featured: false,
  videoUrl: "",
};

function formFromProduct(p: Product): ProductFormState {
  const pct =
    p.compareAt && p.price > 0 && p.compareAt > p.price
      ? Math.round((1 - p.price / p.compareAt) * 100)
      : 0;
  return {
    name: p.name,
    category: p.category,
    price: String(p.price),
    compareAt: p.compareAt ? String(p.compareAt) : "",
    discountPct: pct > 0 ? String(pct) : "",
    freeShipping: !!p.freeShipping,
    stock: String(p.stock),
    weightGrams: String(p.weightGrams),
    image: p.image,
    blurb: p.blurb,
    description: p.description,
    featured: !!p.featured,
    videoUrl: p.videoUrl ?? "",
  };
}

export default function AdminPage() {
  const { user, isAdmin, openAuth, signOut } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-700 ring-1 ring-primary-400/40">
          <Lock className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">Owners only</h1>
        <p className="mt-2 text-foreground/60">
          The admin console manages the catalogue, shipping and orders. Sign in with the
          owner account to continue.
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

  return <AdminConsole />;
}

function AdminConsole() {
  const [tab, setTab] = useState<Tab>("overview");
  const { unreadCount } = useChat();

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = TABS.findIndex((t) => t.id === tab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setTab(TABS[(idx + 1) % TABS.length].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setTab(TABS[(idx - 1 + TABS.length) % TABS.length].id);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-10 shadow-soft sm:px-10 sm:py-12">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl" aria-hidden="true" />
        <p className="eyebrow">Back office</p>
        <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">Admin console</h1>
        <p className="mt-3 max-w-lg text-foreground/65 sm:text-base">
          Manage the catalogue, prices, stock, shipping and configuration — changes go live in
          the shop instantly.
        </p>
        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-100/60 px-3 py-1 text-xs font-bold text-gold-700">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Changes save to this browser instantly
        </span>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/admin/partnerships" className="btn btn-accent w-fit !px-4 !py-2.5 text-sm">
            <Megaphone className="h-4 w-4" aria-hidden="true" /> Manage partnerships
          </Link>
          <Link to="/admin/newsticker" className="btn btn-outline w-fit !px-4 !py-2.5 text-sm">
            <Newspaper className="h-4 w-4" aria-hidden="true" /> Newsticker
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Admin sections"
        onKeyDown={onKeyDown}
        className="no-scrollbar mt-8 flex gap-1 overflow-x-auto border-b border-border pb-px"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`admin-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`admin-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-bold transition-colors duration-150 ${
              tab === t.id
                ? "border-primary bg-primary/5 text-primary-700"
                : "border-transparent text-foreground/55 hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
            {t.id === "chat" && unreadCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 px-1 text-[11px] font-bold text-primary-950 shadow-gold">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <div id="admin-panel-overview" role="tabpanel" aria-labelledby="admin-tab-overview">
            <OverviewTab />
          </div>
        )}
        {tab === "products" && (
          <div id="admin-panel-products" role="tabpanel" aria-labelledby="admin-tab-products">
            <ProductsTab />
          </div>
        )}
        {tab === "stock" && (
          <div id="admin-panel-stock" role="tabpanel" aria-labelledby="admin-tab-stock">
            <StockTab />
          </div>
        )}
        {tab === "shipping" && (
          <div id="admin-panel-shipping" role="tabpanel" aria-labelledby="admin-tab-shipping">
            <ShippingTab />
          </div>
        )}
        {tab === "orders" && (
          <div id="admin-panel-orders" role="tabpanel" aria-labelledby="admin-tab-orders">
            <OrdersTab />
          </div>
        )}
        {tab === "reviews" && (
          <div id="admin-panel-reviews" role="tabpanel" aria-labelledby="admin-tab-reviews">
            <ReviewsTab />
          </div>
        )}
        {tab === "chat" && (
          <div id="admin-panel-chat" role="tabpanel" aria-labelledby="admin-tab-chat">
            <ChatPanel />
          </div>
        )}
        {tab === "users" && (
          <div id="admin-panel-users" role="tabpanel" aria-labelledby="admin-tab-users">
            <UsersTab />
          </div>
        )}
        {tab === "config" && (
          <div id="admin-panel-config" role="tabpanel" aria-labelledby="admin-tab-config">
            <ConfigTab />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview — analytics dashboard                                      */
/* ------------------------------------------------------------------ */

interface DayBucket {
  key: string;
  label: string;
  revenue: number; // Paid revenue
  orders: number; // Orders placed (any payment state)
  units: number; // Items in paid orders
  paid: number; // Orders with an accepted payment
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDayBuckets(orders: Order[], days: number): DayBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));

  const buckets: DayBucket[] = [];
  const byKey = new Map<string, DayBucket>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const bucket: DayBucket = {
      key: localDayKey(d),
      label: `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`,
      revenue: 0,
      orders: 0,
      units: 0,
      paid: 0,
    };
    buckets.push(bucket);
    byKey.set(bucket.key, bucket);
  }

  for (const o of orders) {
    const d = new Date(o.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const b = byKey.get(localDayKey(d));
    if (!b) continue;
    b.orders += 1;
    if (o.paymentStatus !== "accepted") continue;
    b.revenue += o.total;
    b.units += o.items.reduce((s, i) => s + i.qty, 0);
    b.paid += 1;
  }
  return buckets;
}

function bucketTotals(buckets: DayBucket[]) {
  return buckets.reduce(
    (acc, b) => ({
      revenue: acc.revenue + b.revenue,
      orders: acc.orders + b.orders,
      units: acc.units + b.units,
      paid: acc.paid + b.paid,
    }),
    { revenue: 0, orders: 0, units: 0, paid: 0 }
  );
}

/** % change vs the previous period — null means there's no baseline yet. */
function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** Compact Rupiah for dashboards: Rp 1,2 jt / Rp 8 rb / full format below. */
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

function TrendChip({ trend }: { trend: number | null }) {
  if (trend === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-gold-700">
        New
      </span>
    );
  }
  const up = trend > 0;
  const down = trend < 0;
  return (
    <span
      title="vs the previous 30 days"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        up ? "bg-primary/10 text-primary-700" : down ? "bg-destructive/10 text-destructive" : "bg-foreground/10 text-foreground/45"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : down ? <TrendingDown className="h-3 w-3" aria-hidden="true" /> : null}
      {up ? `+${trend}%` : `${trend}%`}
    </span>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  alert,
  accent,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  hint?: string;
  trend?: number | null;
  alert?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
            alert ? "bg-destructive/10 text-destructive" : accent ? "bg-gold-100 text-gold-700" : "bg-primary/10 text-primary-700"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {trend !== undefined && <TrendChip trend={trend} />}
      </div>
      <p className="truncate font-heading text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground/60">
        {label}
        {hint && <span className="text-foreground/45"> · {hint}</span>}
      </p>
    </div>
  );
}

function OverviewTab() {
  const { products, orders } = useStore();
  const { reviews } = useReviews();
  const [range, setRange] = useState<7 | 14 | 30>(14);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    const accepted = (o: Order) => o.paymentStatus === "accepted";
    const inWindow = (o: Order) => new Date(o.createdAt) >= thirtyDaysAgo;

    const cur = bucketTotals(buildDayBuckets(orders, 30));
    const prev = bucketTotals(buildDayBuckets(orders, 60).slice(0, 30));
    const aov = cur.paid ? Math.round(cur.revenue / cur.paid) : 0;
    const aovPrev = prev.paid ? Math.round(prev.revenue / prev.paid) : 0;

    // Top sellers from PAID orders in the last 30 days (excludes cancelled/refunded).
    const sellers = new Map<string, { name: string; image: string; qty: number; revenue: number; orders: number }>();
    for (const o of orders) {
      if (!accepted(o) || !inWindow(o)) continue;
      for (const it of o.items) {
        const entry = sellers.get(it.productId) ?? { name: it.name, image: it.image, qty: 0, revenue: 0, orders: 0 };
        entry.qty += it.qty;
        entry.revenue += it.price * it.qty;
        entry.orders += 1;
        sellers.set(it.productId, entry);
      }
    }

    return {
      current: cur,
      aov,
      aovPrev,
      revenueTrend: pctChange(cur.revenue, prev.revenue),
      ordersTrend: pctChange(cur.orders, prev.orders),
      unitsTrend: pctChange(cur.units, prev.units),
      inStock: products.filter((p) => p.stock > 0).length,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 3).length,
      outOfStock: products.filter((p) => p.stock <= 0).length,
      totalRevenue: orders.reduce((s, o) => s + (accepted(o) ? o.total : 0), 0),
      totalDiscount: orders.reduce((s, o) => s + (o.discount ?? 0), 0),
      paymentCounts: {
        pending: orders.filter((o) => o.paymentStatus === "pending").length,
        submitted: orders.filter((o) => o.paymentStatus === "submitted").length,
        accepted: orders.filter((o) => o.paymentStatus === "accepted").length,
        declined: orders.filter((o) => o.paymentStatus === "declined").length,
        refunded: orders.filter((o) => o.paymentStatus === "refunded").length,
      },
      topSellers: Array.from(sellers.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
  }, [products, orders]);

  const chartBuckets = useMemo(() => buildDayBuckets(orders, range), [orders, range]);
  const chartTotal = bucketTotals(chartBuckets);
  const maxRevenue = Math.max(...chartBuckets.map((b) => b.revenue), 1);

  const publishedReviews = reviews.filter((r) => r.status !== "hidden");
  const avgRating = publishedReviews.length
    ? Math.round((publishedReviews.reduce((s, r) => s + r.rating, 0) / publishedReviews.length) * 10) / 10
    : 0;

  const totalOrders = orders.length;
  const needsAction = stats.paymentCounts.submitted;
  const labelEvery = range === 30 ? 5 : range === 14 ? 2 : 1;
  const isTodayKey = localDayKey(new Date());

  const PAY_SEGMENTS: { key: string; label: string; count: number; color: string }[] = [
    { key: "pending", label: "Payment pending", count: stats.paymentCounts.pending, color: "bg-foreground/25" },
    { key: "submitted", label: "Awaiting confirmation", count: stats.paymentCounts.submitted, color: "bg-gradient-to-r from-gold-400 to-gold-600" },
    { key: "accepted", label: "Paid", count: stats.paymentCounts.accepted, color: "bg-primary" },
    { key: "refunded", label: "Refunded", count: stats.paymentCounts.refunded, color: "bg-destructive/50" },
    { key: "declined", label: "Declined", count: stats.paymentCounts.declined, color: "bg-destructive" },
  ];

  return (
    <>
      {/* Headline financial KPIs (with trend vs the previous 30 days) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          icon={BadgeDollarSign}
          label="Revenue"
          value={formatCompact(stats.current.revenue)}
          hint="paid, 30 days"
          trend={stats.revenueTrend}
        />
        <MetricTile
          icon={ShoppingCart}
          label="Orders"
          value={String(stats.current.orders)}
          hint="placed in 30 days"
          trend={stats.ordersTrend}
        />
        <MetricTile
          icon={Wallet}
          label="Avg order value"
          value={stats.aov > 0 ? formatIDR(stats.aov) : "—"}
          hint="per paid order"
          trend={stats.aov > 0 ? pctChange(stats.aov, stats.aovPrev) : undefined}
        />
        <MetricTile
          icon={Boxes}
          label="Units sold"
          value={String(stats.current.units)}
          hint="in paid orders"
          trend={stats.unitsTrend}
        />
      </div>

      {/* Inventory + community */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile icon={PackageIcon} label="Products" value={`${stats.inStock}/${products.length}`} hint="in stock" />
        <MetricTile icon={Boxes} label="Low stock" value={String(stats.lowStock)} hint="≤ 3 units" alert={stats.lowStock > 0} />
        <MetricTile icon={X} label="Out of stock" value={String(stats.outOfStock)} hint="need restock" alert={stats.outOfStock > 0} />
        <MetricTile
          icon={Star}
          label="Reviews"
          value={publishedReviews.length > 0 ? `${avgRating.toFixed(1)} ★` : "—"}
          hint={`${publishedReviews.length} published`}
          accent
        />
      </div>

      {/* Revenue trend + payment breakdown */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-heading font-bold">
                <BarChart3 className="h-4 w-4 text-primary-700" aria-hidden="true" />
                Sales trend
              </h2>
              <p className="mt-0.5 text-xs text-foreground/55">
                {formatCompact(chartTotal.revenue)} revenue · {chartTotal.orders} order{chartTotal.orders === 1 ? "" : "s"} ·{" "}
                {chartTotal.units} item{chartTotal.units === 1 ? "" : "s"} in the last {range} days
              </p>
            </div>
            <div role="group" aria-label="Chart range" className="flex gap-1.5">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={range === d}
                  className={`chip !py-1.5 text-xs ${range === d ? "chip-active" : ""}`}
                  onClick={() => setRange(d)}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {chartTotal.orders === 0 ? (
            <div className="px-5 py-12 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-foreground/25" aria-hidden="true" />
              <p className="mt-3 font-heading font-bold">No sales to chart yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
                Place an order at checkout and the daily revenue bars appear here instantly.
              </p>
            </div>
          ) : (
            <div className="px-5 pb-5 pt-6">
              <p className="sr-only">
                Revenue per day for the last {range} days:{" "}
                {chartBuckets.map((b) => `${b.label} ${b.revenue > 0 ? formatIDR(b.revenue) : "no sales"}`).join("; ")}.
              </p>
              <div className="relative">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-36" aria-hidden="true">
                  <div className="absolute inset-x-0 top-0 border-t border-border/40" />
                  <div className="absolute inset-x-0 top-1/3 border-t border-border/20" />
                  <div className="absolute inset-x-0 top-2/3 border-t border-border/20" />
                  <div className="absolute inset-x-0 top-full border-t border-border/40" />
                </div>
                <div className="relative flex h-36 items-end gap-1 px-1">
                  {chartBuckets.map((b, i) => {
                    const pct = Math.max(b.revenue > 0 ? 4 : 0, Math.round((b.revenue / maxRevenue) * 100));
                    const isToday = b.key === isTodayKey;
                    return (
                      <div key={b.key} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-center text-[11px] leading-tight shadow-soft group-hover:block">
                          <p className="font-semibold">{b.label}</p>
                          <p className="font-bold text-primary-700">{b.revenue > 0 ? formatIDR(b.revenue) : "No sales"}</p>
                          <p className="text-foreground/50">
                            {b.orders} order{b.orders === 1 ? "" : "s"} · {b.units} item{b.units === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span
                          role="img"
                          aria-label={`${b.label}: ${b.revenue > 0 ? formatIDR(b.revenue) : "no revenue"}, ${b.orders} order${b.orders === 1 ? "" : "s"}, ${b.units} item${b.units === 1 ? "" : "s"}`}
                          className={`block w-full max-w-6 rounded-t-sm transition-colors duration-200 ${
                            b.revenue > 0
                              ? isToday
                                ? "bg-gradient-to-t from-gold-600 to-gold-300"
                                : "bg-gradient-to-t from-primary-700 to-primary-400"
                              : "bg-foreground/10"
                          }`}
                          style={{ height: `${pct}%` }}
                        />
                        {(i === 0 || i === chartBuckets.length - 1 || i % labelEvery === 0) && (
                          <span className="mt-1.5 text-[10px] font-semibold text-foreground/45">{b.label}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-foreground/50">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-primary-700 to-primary-400" aria-hidden="true" /> Daily revenue (Rp)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gold-400" aria-hidden="true" /> Today
                </span>
                <span className="ml-auto">Paid revenue only — pending, declined and refunded orders are excluded.</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="card flex flex-col p-5">
          <h2 className="flex items-center gap-2 font-heading font-bold">
            <Wallet className="h-4 w-4 text-primary-700" aria-hidden="true" /> Payments
          </h2>
          <p className="mt-0.5 text-xs text-foreground/55">
            {totalOrders} order{totalOrders === 1 ? "" : "s"} all-time
            {needsAction > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-gold-100 px-2 py-0.5 font-bold text-gold-700">
                {needsAction} need{needsAction === 1 ? "s" : ""} your confirmation
              </span>
            )}
          </p>

          {totalOrders === 0 ? (
            <p className="flex flex-1 items-center justify-center pt-8 text-center text-sm text-foreground/50">
              No payments yet — the split fills in as orders arrive.
            </p>
          ) : (
            <>
              <div
                role="img"
                aria-label={`Payment breakdown: ${PAY_SEGMENTS.filter((p) => p.count > 0).map((p) => `${p.count} ${p.label}`).join(", ")}`}
                className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-foreground/10"
              >
                {PAY_SEGMENTS.filter((p) => p.count > 0).map((p) => (
                  <span key={p.key} className={`h-full ${p.color}`} style={{ width: `${(p.count / totalOrders) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-4 space-y-2.5">
                {PAY_SEGMENTS.map((p) => (
                  <li key={p.key} className="flex items-center gap-2.5 text-sm">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.color}`} aria-hidden="true" />
                    <span className="flex-1 text-foreground/70">{p.label}</span>
                    <span className="font-bold">{p.count}</span>
                    <span className="w-10 shrink-0 text-right text-xs font-semibold text-foreground/45">
                      {Math.round((p.count / totalOrders) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto space-y-1.5 border-t border-border pt-3 text-xs font-semibold text-foreground/55">
                <p className="flex items-center justify-between">
                  <span>Paid revenue (all-time)</span>
                  <span className="font-bold text-primary-700">{formatIDR(stats.totalRevenue)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Coupon discounts given</span>
                  <span className="font-bold text-gold-700">−{formatIDR(stats.totalDiscount)}</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top sellers + recent orders */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading font-bold">
              <PackageIcon className="h-4 w-4 text-primary-700" aria-hidden="true" /> Top sellers
            </h2>
            <p className="mt-0.5 text-xs text-foreground/55">by revenue from paid orders, last 30 days</p>
          </div>
          {stats.topSellers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <PackageIcon className="mx-auto h-8 w-8 text-foreground/25" aria-hidden="true" />
              <p className="mt-3 font-heading font-bold">Nothing sold yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
                Once the first payment is confirmed, your best sellers rank here automatically.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stats.topSellers.map((t, i) => (
                <li key={t.name} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-5 shrink-0 text-center font-heading text-sm font-bold text-foreground/40">{i + 1}</span>
                  {t.image ? (
                    <img src={t.image} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-foreground/10 object-cover" />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-700">
                      <PackageIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{t.name}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-700 to-primary-400"
                        style={{ width: `${Math.max(4, (t.revenue / (stats.topSellers[0]?.revenue || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="block text-sm font-bold text-primary-700">{formatCompact(t.revenue)}</span>
                    <span className="block text-[11px] font-semibold text-foreground/45">
                      {t.qty} unit{t.qty === 1 ? "" : "s"} · {t.orders} order{t.orders === 1 ? "" : "s"}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading font-bold">Recent orders</h2>
            <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-bold text-foreground/60">{totalOrders} total</span>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <ShoppingCart className="mx-auto h-8 w-8 text-foreground/30" aria-hidden="true" />
              <p className="mt-3 font-heading font-bold">No orders yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
                Orders placed in the storefront will appear here with live status updates.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{o.id}</p>
                    <p className="truncate text-foreground/55">
                      {o.customer} · {o.items.reduce((s, i) => s + i.qty, 0)} item(s)
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <p className="font-semibold">{formatIDR(o.total)}</p>
                    <PaymentBadge status={o.paymentStatus} />
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-6 rounded-2xl border border-border bg-foreground/10 px-4 py-3 text-center text-xs text-foreground/55">
        Everything syncs with your Supabase database — open the store in another browser and refresh
        to pull in the latest orders, catalogue and accounts.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

function ProductsTab() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const { categories: configCategories } = useConfig();
  const [editing, setEditing] = useState<{ id: string | null; form: ProductFormState } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function startNew() {
    setEditing({ id: null, form: EMPTY_FORM });
    setNotice(null);
  }

  function startEdit(p: Product) {
    setEditing({ id: p.id, form: formFromProduct(p) });
    setNotice(null);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { id, form } = editing;
    if (!form.name.trim()) {
      setNotice("Product needs a name.");
      return;
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      setNotice("Set a valid price above 0.");
      return;
    }
    const pct = Number(form.discountPct);
    let compareAt = form.compareAt ? Number(form.compareAt) : undefined;
    if (Number.isFinite(pct) && pct > 0 && pct < 100) {
      compareAt = Math.round(price / (1 - pct / 100));
    }
    const patch = {
      name: form.name.trim(),
      category: form.category,
      price,
      compareAt: compareAt && compareAt > price ? compareAt : undefined,
      freeShipping: form.freeShipping,
      stock: Math.max(0, Math.round(Number(form.stock) || 0)),
      weightGrams: Math.max(0, Math.round(Number(form.weightGrams) || 0)),
      image: form.image,
      blurb: form.blurb.trim() || form.name.trim(),
      description: form.description.trim() || form.name.trim(),
      featured: form.featured,
      videoUrl: form.videoUrl.trim() || undefined,
    };
    if (id) {
      updateProduct(id, patch);
      setNotice(`"${patch.name}" updated.`);
    } else {
      addProduct({ ...patch, rating: 4.5, reviews: 0 });
      setNotice(`"${patch.name}" added to the shop.`);
    }
    setEditing(null);
  }

  function remove(p: Product) {
    deleteProduct(p.id);
    setConfirmingDelete(null);
    setNotice(`"${p.name}" deleted.`);
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? products.filter((p) => {
        const categoryName = configCategories.find((c) => c.id === p.category)?.name ?? p.category;
        return [p.name, p.blurb, categoryName, String(p.price), formatIDR(p.price)].join(" ").toLowerCase().includes(q);
      })
    : products;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Products</h2>
          <p className="text-sm text-foreground/55">
            {filtered.length} of {products.length} items shown · price, compare-at, weight and details editable
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
            <label htmlFor="admin-product-search" className="sr-only">Search products</label>
            <input
              id="admin-product-search"
              type="search"
              className="input !pl-10"
              placeholder="Search name, category or price…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-accent" onClick={startNew}>
            <PackagePlus className="h-4 w-4" aria-hidden="true" /> Add product
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}

      {editing && <ProductForm key={editing.id ?? "new"} initial={editing.form} onSubmit={save} onCancel={() => setEditing(null)} />}

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        <ul className="divide-y divide-border">
          {filtered.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <img src={p.image} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-foreground/10 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold">{p.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/55">
                  <span className="font-bold text-foreground">{formatIDR(p.price)}</span>
                  {p.compareAt && (
                    <span className="rounded-full bg-gold-100 px-2 py-0.5 font-bold text-gold-700">
                      Save {Math.round((1 - p.price / p.compareAt) * 100)}%
                    </span>
                  )}
                  {p.freeShipping && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary-700">
                      <Truck className="h-3 w-3" aria-hidden="true" /> Free ship
                    </span>
                  )}
                  <span>·</span>
                  <span>{configCategories.find((c) => c.id === p.category)?.name ?? p.category}</span>
                  <span className={`font-bold ${p.stock <= 0 ? "text-destructive" : p.stock <= 3 ? "text-gold-700" : "text-primary-700"}`}>
                    {p.stock <= 0 ? "Out of stock" : `${p.stock} in stock`}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {confirmingDelete === p.id ? (
                  <>
                    <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => remove(p)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirm delete
                    </button>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirmingDelete(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => startEdit(p)} aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </button>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs text-destructive" onClick={() => setConfirmingDelete(p.id)} aria-label={`Delete ${p.name}`}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-foreground/25" aria-hidden="true" />
            <p className="mt-3 font-heading font-bold">No products match your search</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
              {query.trim()
                ? `Nothing matches “${query.trim()}” — try a different name, category or price.`
                : "The catalogue is empty — add your first product above."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductForm({ initial, onSubmit, onCancel }: { initial: ProductFormState; onSubmit: (e: FormEvent) => void; onCancel: () => void }) {
  const { categories } = useConfig();
  const [form, setForm] = useState<ProductFormState>(initial);
  const [image, setImage] = useState(initial.image);
  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold">{initial.name ? `Edit: ${initial.name}` : "New product"}</h3>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-2 text-foreground/55" aria-label="Close form">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="pf-name" className="field-label">Product name *</label>
          <input id="pf-name" className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Carbon Break Cue" />
        </div>
        <div>
          <label htmlFor="pf-category" className="field-label">Category</label>
          <select id="pf-category" className="input" value={form.category} onChange={(e) => set("category", e.target.value as CategoryId)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.enabled ? "" : " (disabled)"}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-image" className="field-label">Image</label>
          <div className="flex items-center gap-2">
            <img src={image} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-foreground/10 object-cover" />
            <select id="pf-image" className="input !py-2" value={image} onChange={(e) => { setImage(e.target.value); set("image", e.target.value); }}>
              {IMAGE_OPTIONS.map((src) => (
                <option key={src} value={src}>{src.split("/").pop()}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="pf-price" className="field-label">Price (Rp) *</label>
          <input id="pf-price" type="number" min="1" step="1000" className="input" required value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1500000" />
        </div>
        <div>
          <label htmlFor="pf-discount" className="field-label">Discount (%)</label>
          <input
            id="pf-discount"
            type="number"
            min="0"
            max="90"
            step="1"
            className="input"
            value={form.discountPct}
            onChange={(e) => {
              const v = e.target.value;
              set("discountPct", v);
              const pct = Number(v);
              const priceNum = Number(form.price);
              if (Number.isFinite(pct) && pct > 0 && pct < 100 && priceNum > 0) {
                set("compareAt", String(Math.round(priceNum / (1 - pct / 100))));
              } else if (v === "") {
                set("compareAt", "");
              }
            }}
            placeholder="e.g. 10"
          />
          <p className="mt-1 text-xs text-foreground/50">Auto-fills the compare-at price — shown as &ldquo;Save X%&rdquo;.</p>
        </div>
        <div>
          <label htmlFor="pf-compare" className="field-label">Compare-at price (Rp, optional)</label>
          <input
            id="pf-compare"
            type="number"
            min="0"
            step="1000"
            className="input"
            value={form.compareAt}
            onChange={(e) => {
              const v = e.target.value;
              set("compareAt", v);
              const priceNum = Number(form.price);
              const caNum = Number(v);
              if (priceNum > 0 && caNum > priceNum) {
                set("discountPct", String(Math.round((1 - priceNum / caNum) * 100)));
              } else if (v === "") {
                set("discountPct", "");
              }
            }}
            placeholder="1800000"
          />
        </div>
        <div>
          <label htmlFor="pf-stock" className="field-label">Stock (units)</label>
          <input id="pf-stock" type="number" min="0" className="input" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
        </div>
        <div>
          <label htmlFor="pf-weight" className="field-label">Weight (grams)</label>
          <input id="pf-weight" type="number" min="0" className="input" value={form.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pf-blurb" className="field-label">Short blurb</label>
          <input id="pf-blurb" className="input" value={form.blurb} onChange={(e) => set("blurb", e.target.value)} placeholder="One line for cards & search" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pf-desc" className="field-label">Description</label>
          <textarea id="pf-desc" rows={3} className="input" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Full product story shown on the detail page" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pf-video" className="field-label">Video URL (optional)</label>
          <input
            id="pf-video"
            type="url"
            className="input"
            value={form.videoUrl}
            onChange={(e) => set("videoUrl", e.target.value)}
            placeholder="https://youtube.com/watch?v=… or a direct .mp4 link"
          />
          <p className="mt-1 text-xs text-foreground/50">
            YouTube, Vimeo or a direct video file — shown as an embedded player on the product page.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
        <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-primary" />
        Feature on the homepage
      </label>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
        <input type="checkbox" checked={form.freeShipping} onChange={(e) => set("freeShipping", e.target.checked)} className="h-4 w-4 accent-primary" />
        <Truck className="h-4 w-4 text-primary-700" aria-hidden="true" />
        Ships free — no shipping charge for this item, whatever the order total
      </label>

      <div className="flex gap-3 border-t border-border pt-4">
        <button type="submit" className="btn btn-primary">
          <Check className="h-4 w-4" aria-hidden="true" /> Save product
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Stock                                                               */
/* ------------------------------------------------------------------ */

function StockTab() {
  const { products, updateStock } = useStore();
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const list = useMemo(() => {
    if (filter === "low") return products.filter((p) => p.stock > 0 && p.stock <= 3);
    if (filter === "out") return products.filter((p) => p.stock <= 0);
    return products;
  }, [products, filter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Stock levels</h2>
          <p className="text-sm text-foreground/55">Adjust quantities — the shopfront updates instantly.</p>
        </div>
        <div role="group" aria-label="Stock filter" className="flex gap-2">
          {(
            [
              { id: "all", label: "All" },
              { id: "low", label: "Low (≤3)" },
              { id: "out", label: "Out" },
            ] as const
          ).map((f) => (
            <button key={f.id} type="button" className={`chip ${filter === f.id ? "chip-active" : ""}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        <ul className="divide-y divide-border">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-foreground/10 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{p.name}</p>
                <p className={`text-xs font-bold ${p.stock <= 0 ? "text-destructive" : p.stock <= 3 ? "text-gold-700" : "text-primary-700"}`}>
                  {p.stock <= 0 ? "Out of stock" : `${p.stock} units`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className="btn btn-outline !h-9 !w-9 !px-0"
                  aria-label={`Decrease stock for ${p.name}`}
                  onClick={() => updateStock(p.id, p.stock - 1)}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-10 text-center font-heading text-lg font-bold">{p.stock}</span>
                <button
                  type="button"
                  className="btn btn-outline !h-9 !w-9 !px-0"
                  aria-label={`Increase stock for ${p.name}`}
                  onClick={() => updateStock(p.id, p.stock + 1)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {list.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-foreground/55">Nothing matches this filter — nice and stocked up!</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shipping                                                            */
/* ------------------------------------------------------------------ */

function ShippingTab() {
  const { shippingMethods, addShippingMethod, updateShippingMethod, deleteShippingMethod, settings, updateSettings } = useStore();
  const [threshold, setThreshold] = useState(String(settings.freeShippingThreshold));
  const [saved, setSaved] = useState(false);

  function saveThreshold() {
    const v = Math.max(0, Math.round(Number(threshold) || 0));
    updateSettings({ freeShippingThreshold: v });
    setThreshold(String(v));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold">Shipping & couriers</h2>
        <p className="text-sm text-foreground/55">Flat base fee + per-kg fee. Free shipping applies above the threshold.</p>
      </div>

      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="thresh" className="field-label">Free shipping threshold (Rp)</label>
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" />
            <input id="thresh" type="number" min="0" step="10000" className="input" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <p className="mt-1 text-xs text-foreground/50">
            Orders at or above this total ship free. Current setting: {formatIDR(settings.freeShippingThreshold)}.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={saveThreshold}>
          {saved ? (<><Check className="h-4 w-4" aria-hidden="true" /> Saved</>) : "Save threshold"}
        </button>
      </div>

      <div className="space-y-3">
        {shippingMethods.map((m) => (
          <MethodRow key={m.id} method={m} onUpdate={(patch) => updateShippingMethod(m.id, patch)} onDelete={() => deleteShippingMethod(m.id)} />
        ))}
        {shippingMethods.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/55">
            No couriers yet — add your first shipping method.
          </p>
        )}
        <button type="button" className="btn btn-outline" onClick={() => addShippingMethod({ name: "New Courier", eta: "2–4 days", baseRate: 10000, perKg: 8000, active: true })}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add courier
        </button>
      </div>
    </div>
  );
}

function MethodRow({ method, onUpdate, onDelete }: { method: ShippingMethod; onUpdate: (patch: Partial<ShippingMethod>) => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <label className="flex cursor-pointer items-center gap-2.5 sm:w-32">
        <input type="checkbox" checked={method.active} onChange={(e) => onUpdate({ active: e.target.checked })} className="h-4 w-4 accent-primary" />
        <span className="font-heading font-bold">{method.name}</span>
      </label>
      <div className="grid flex-1 gap-2 sm:grid-cols-4">
        <label className="sr-only" htmlFor={`mname-${method.id}`}>Courier name</label>
        <input id={`mname-${method.id}`} className="input !py-2 text-sm" value={method.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        <label className="sr-only" htmlFor={`meta-${method.id}`}>ETA</label>
        <input id={`meta-${method.id}`} className="input !py-2 text-sm" value={method.eta} onChange={(e) => onUpdate({ eta: e.target.value })} placeholder="2–4 days" />
        <label className="sr-only" htmlFor={`mbase-${method.id}`}>Base fee</label>
        <input id={`mbase-${method.id}`} type="number" min="0" step="500" className="input !py-2 text-sm" value={method.baseRate} onChange={(e) => onUpdate({ baseRate: Math.max(0, Number(e.target.value) || 0) })} />
        <label className="sr-only" htmlFor={`mkg-${method.id}`}>Per-kg fee</label>
        <input id={`mkg-${method.id}`} type="number" min="0" step="500" className="input !py-2 text-sm" value={method.perKg} onChange={(e) => onUpdate({ perKg: Math.max(0, Number(e.target.value) || 0) })} />
      </div>
      <p className="hidden shrink-0 text-xs text-foreground/55 xl:block">≈ {formatIDR(method.baseRate + method.perKg * 2)} / 2kg</p>
      <div className="flex shrink-0 items-center gap-2">
        {confirming ? (
          <>
            <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
            </button>
            <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(false)}>Keep</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs text-destructive" onClick={() => setConfirming(true)} aria-label={`Delete ${method.name}`}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

function OrdersTab() {
  const { orders, setOrderStatus, updatePaymentStatus, refundOrder } = useStore();
  const { releaseForOrder } = useCoupons();
  const [filter, setFilter] = useState<"all" | "action" | "finished">("all");

  const list = orders.filter((o) => {
    if (filter === "finished") return o.status === "Delivered" || o.status === "Cancelled";
    if (filter === "action") {
      return (
        o.paymentStatus === "submitted" ||
        ["Pending", "Paid", "Prepared", "Shipped"].includes(o.status)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Orders</h2>
          <p className="text-sm text-foreground/55">
            Confirm payments, then walk each order through prepare, ship, transit and delivered —
            every step is timestamped for the customer&apos;s tracking page.
          </p>
        </div>
        <div role="group" aria-label="Order filter" className="flex gap-2">
          {(
            [
              ["all", "All"],
              ["action", "Needs action"],
              ["finished", "Finished"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={`chip ${filter === id ? "chip-active" : ""}`} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card px-5 py-14 text-center">
          <ReceiptText className="mx-auto h-10 w-10 text-foreground/25" aria-hidden="true" />
          <p className="mt-4 font-heading text-lg font-bold">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            When a customer places an order at checkout it lands here with full details, a payment
            status you confirm, and the timeline of every event.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((o) => (
            <OrderAdminCard
              key={o.id}
              order={o}
              onStatus={(s) => setOrderStatus(o.id, s)}
              onPayment={(p) => {
                updatePaymentStatus(o.id, p);
                // A declined (cancelled) order never used its coupon — return it.
                if (p === "declined") releaseForOrder(o.id);
              }}
              onRefund={() => {
                refundOrder(o.id);
                // A refunded order gave nothing away — release the coupon too.
                releaseForOrder(o.id);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderAdminCard({
  order: o,
  onStatus,
  onPayment,
  onRefund,
}: {
  order: Order;
  onStatus: (s: OrderStatus) => void;
  onPayment: (p: "accepted" | "declined") => void;
  onRefund: () => void;
}) {
  const nextSteps = (["Prepared", "Shipped", "In transit", "Delivered", "Cancelled"] as OrderStatus[]).filter(
    (s) => canTransition(o.status, s)
  );
  const [confirmRefund, setConfirmRefund] = useState(false);

  return (
    <li className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <p className="font-heading font-bold">{o.id}</p>
          <p className="text-xs text-foreground/55">
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(o.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <PaymentBadge status={o.paymentStatus} />
          <StatusBadge status={o.status} />
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {o.customer} {o.email && <span className="font-normal text-foreground/55">· {o.email}</span>}
          </p>
          {(o.address || o.city) && (
            <p className="mt-0.5 text-xs text-foreground/55">
              {o.address && <span className="block truncate">{o.address}</span>}
              {[o.city, o.province, o.postalCode].filter(Boolean).join(", ")}
              {o.phone && <span className="text-foreground/45"> · {o.phone}</span>}
            </p>
          )}
          {o.lat !== undefined && o.lng !== undefined && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/45">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              Pin: {o.lat.toFixed(4)}, {o.lng.toFixed(4)}
            </p>
          )}
          <ul className="mt-2 space-y-1 text-sm text-foreground/75">
            {o.items.map((it) => (
              <li key={it.productId + it.name + it.qty + it.price} className="flex justify-between gap-4">
                <span className="min-w-0 truncate">{it.name} × {it.qty}</span>
                <span className="shrink-0 font-semibold">{formatIDR(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-foreground/55">{o.carrier} · {o.payment}</p>
        </div>
        <div className="shrink-0 lg:text-right">
          <p className="text-xs font-semibold text-foreground/55">
            Subtotal {formatIDR(o.subtotal)}
            {o.discount > 0 && <span className="text-gold-700"> − coupon {formatIDR(o.discount)}</span>}
            {" + ship "}{formatIDR(o.shipping)}
            {o.couponCode && <span className="text-foreground/45"> ({o.couponCode})</span>}
          </p>
          <p className="font-heading text-2xl font-bold text-primary-700">{formatIDR(o.total)}</p>
        </div>
      </div>

      {/* Payment confirmation */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-foreground/10 px-5 py-3">
        {o.paymentStatus === "submitted" ? (
          <>
            <span className="text-sm font-semibold text-gold-700">Payment submitted — confirm or decline:</span>
            <button type="button" className="btn btn-primary !px-3.5 !py-1.5 text-xs" onClick={() => onPayment("accepted")}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Accept payment
            </button>
            <button type="button" className="btn btn-outline !border-destructive/40 !px-3.5 !py-1.5 text-xs text-destructive" onClick={() => onPayment("declined")}>
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Decline payment
            </button>
          </>
        ) : o.paymentStatus === "refunded" ? (
          <span className="text-sm font-semibold text-destructive">Refunded — payment returned to the customer and stock restored.</span>
        ) : o.paymentStatus === "declined" ? (
          <span className="text-sm font-semibold text-destructive">Payment declined — order cancelled and stock returned.</span>
        ) : (
          <span className="text-sm text-foreground/55">Move the order forward:</span>
        )}

        {o.paymentStatus === "accepted" && o.status !== "Cancelled" && (
          <span className="ml-auto flex items-center gap-2">
            {confirmRefund ? (
              <>
                <span className="text-xs font-semibold text-destructive">Refund the full {formatIDR(o.total)}?</span>
                <button type="button" className="btn btn-primary !border-destructive/30 !bg-destructive !px-3 !py-1.5 text-xs text-on-primary" onClick={() => { setConfirmRefund(false); onRefund(); }}>
                  <BadgeDollarSign className="h-3.5 w-3.5" aria-hidden="true" /> Confirm refund
                </button>
                <button type="button" className="btn btn-ghost !px-2 text-xs" onClick={() => setConfirmRefund(false)}>Keep</button>
              </>
            ) : (
              <button type="button" className="btn btn-ghost !border-destructive/30 !px-3 !py-1.5 text-xs text-destructive" onClick={() => setConfirmRefund(true)}>
                <BadgeDollarSign className="h-3.5 w-3.5" aria-hidden="true" /> Issue refund
              </button>
            )}
          </span>
        )}

        {nextSteps.length > 0 && o.status !== "Cancelled" && (
          <span className="ml-auto flex flex-wrap gap-1.5">
            {nextSteps.map((s) => (
              <button
                key={s}
                type="button"
                className="chip !py-1.5 text-xs"
                onClick={() => onStatus(s)}
              >
                {s === "Cancelled" ? <><X className="h-3 w-3" aria-hidden="true" /> {s}</> : s}
              </button>
            ))}
          </span>
        )}
      </div>

      <div className="border-t border-border px-5 py-4">
        <OrderTimeline order={o} />
      </div>
    </li>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    pending: "bg-foreground/10 text-foreground/60",
    submitted: "bg-gold-100 text-gold-700",
    accepted: "bg-primary/10 text-primary-700",
    declined: "bg-destructive/10 text-destructive",
    refunded: "bg-destructive/10 text-destructive",
  };
  const labels: Record<PaymentStatus, string> = {
    pending: "Payment pending",
    submitted: "Payment submitted",
    accepted: "Paid",
    declined: "Payment declined",
    refunded: "Refunded",
  };
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    Pending: "bg-gold-100 text-gold-700",
    Paid: "bg-primary/10 text-primary-700",
    Prepared: "bg-primary/10 text-primary-700",
    Shipped: "bg-primary/10 text-primary-700",
    Picked: "bg-primary/10 text-primary-700",
    "In transit": "bg-primary/10 text-primary-700",
    Delivered: "bg-primary/10 text-primary-700",
    Cancelled: "bg-destructive/10 text-destructive",
  };
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{status}</span>;
}

/* ------------------------------------------------------------------ */
/* Customer reviews (verify, hide, edit, delete)                       */
/* ------------------------------------------------------------------ */

function ReviewsTab() {
  const { reviews, updateReview, deleteReview } = useReviews();
  const { products } = useStore();
  const [filter, setFilter] = useState<"all" | "published" | "hidden">("all");
  const [editing, setEditing] = useState<ProductReview | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const productName = (id: string) =>
    products.find((p) => p.id === id)?.name ?? "Deleted product";

  const list = useMemo(() => {
    const filtered =
      filter === "published"
        ? reviews.filter((r) => r.status !== "hidden")
        : filter === "hidden"
          ? reviews.filter((r) => r.status === "hidden")
          : reviews;
    return [...filtered].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [reviews, filter]);

  const publishedCount = reviews.filter((r) => r.status !== "hidden").length;
  const hiddenCount = reviews.length - publishedCount;

  return (
    <div className="space-y-5">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Customer reviews</h2>
          <p className="text-sm text-foreground/55">
            {reviews.length} review{reviews.length === 1 ? "" : "s"} · hide anything that
            doesn&apos;t belong, edit mistakes or delete outright — changes hit the product
            page instantly.
          </p>
        </div>
        <div role="group" aria-label="Review filter" className="flex gap-2">
          {(
            [
              ["all", `All (${reviews.length})`],
              ["published", `Published (${publishedCount})`],
              ["hidden", `Hidden (${hiddenCount})`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={`chip ${filter === id ? "chip-active" : ""}`} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {editing && (
        <ReviewModal
          orderId={editing.orderId}
          productId={editing.productId}
          productName={productName(editing.productId)}
          author={editing.author}
          existing={editing}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            updateReview(editing.id, {
              author: input.author,
              rating: input.rating,
              comment: input.comment ?? "",
              media: input.media ?? [],
            });
            setEditing(null);
            setNotice("Review updated — shoppers see the change immediately.");
          }}
        />
      )}

      {list.length === 0 ? (
        <div className="card px-5 py-14 text-center">
          <Star className="mx-auto h-10 w-10 text-foreground/25" aria-hidden="true" />
          <p className="mt-4 font-heading text-lg font-bold">No reviews here</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            {filter === "hidden"
              ? "Nothing is hidden right now — every review is live on the product pages."
              : "When a buyer confirms their order, their review lands here for you to moderate."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
          {list.map((r) => (
            <li key={r.id} className={`flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center ${r.status === "hidden" ? "opacity-75" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-heading font-bold">{r.author}</span>
                  <span className="flex gap-0.5" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-gold-500 text-gold-500" : "fill-foreground/15 text-foreground/15"}`}
                      />
                    ))}
                  </span>
                  <span className="text-foreground/45">
                    {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(r.at))}
                  </span>
                  {r.status === "hidden" && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive">
                      Hidden
                    </span>
                  )}
                </p>
                <p className="mt-1 truncate font-semibold text-primary-700">{productName(r.productId)}</p>
                {r.comment && <p className="mt-1 text-sm leading-relaxed text-foreground/70">{r.comment}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:justify-end">
                <button
                  type="button"
                  className="btn btn-ghost !px-3 !py-1.5 text-xs"
                  onClick={() => {
                    updateReview(r.id, { status: r.status === "hidden" ? "published" : "hidden" });
                    setNotice(r.status === "hidden" ? "Review published — it's visible to shoppers again." : "Review hidden from shoppers — you can unhide it any time.");
                  }}
                >
                  {r.status === "hidden" ? (
                    <><Check className="h-3.5 w-3.5" aria-hidden="true" /> Publish</>
                  ) : (
                    <><EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> Hide</>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost !px-3 !py-1.5 text-xs"
                  onClick={() => {
                    setNotice(null);
                    setEditing(r);
                  }}
                  aria-label={`Edit review by ${r.author}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
                {confirming === r.id ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary !bg-destructive !px-3 !py-1.5 text-xs text-on-primary"
                      onClick={() => {
                        deleteReview(r.id);
                        setConfirming(null);
                        setNotice("Review deleted permanently.");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirm delete
                    </button>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                    onClick={() => {
                      setNotice(null);
                      setConfirming(r.id);
                    }}
                    aria-label={`Delete review by ${r.author}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-foreground/50">
        Hidden reviews are kept (and never counted in a product&apos;s rating); deleted reviews are gone for good.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat inbox (shared by every admin — two-way with customers)         */
/* ------------------------------------------------------------------ */

function ChatPanel() {
  const { user } = useAuth();
  const {
    threads,
    activeThreadId,
    messages,
    markThreadRead,
    selectThread,
    sendMessage,
    clearHistory,
  } = useChat();
  const [reply, setReply] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  // Viewing a thread counts as reading it — clears the unread badge.
  useEffect(() => {
    if (activeThreadId) markThreadRead();
  }, [activeThreadId, markThreadRead, messages.length]);

  // Scroll + focus the reply box whenever the conversation changes.
  useEffect(() => {
    if (!activeThread) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    inputRef.current?.focus();
  }, [activeThread, messages.length]);

  function handleClear() {
    clearHistory();
    setConfirmClear(false);
    setNotice("All conversations cleared — the storefront widget starts fresh.");
  }

  function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    const ok = sendMessage(reply);
    if (ok) setReply("");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Customer chat inbox</h2>
          <p className="text-sm text-foreground/55">
            Every conversation from the storefront widget — any admin account can open a thread
            and reply. Replies appear instantly in the customer&apos;s chat bubble.
          </p>
        </div>
        <button type="button" className="btn btn-ghost text-destructive" onClick={() => setConfirmClear(true)}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear history
        </button>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}

      {confirmClear && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3">
          <span className="text-sm font-semibold text-destructive">
            Delete every conversation for this browser?
          </span>
          <span className="ml-auto flex gap-2">
            <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={handleClear}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Yes, clear all
            </button>
            <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirmClear(false)}>
              Keep it
            </button>
          </span>
        </div>
      )}

      {threads.length === 0 ? (
        <div className="card px-5 py-14 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-foreground/25" aria-hidden="true" />
          <p className="mt-4 font-heading text-lg font-bold">No conversations yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            When a visitor opens the chat bubble on the storefront and sends a message, a thread
            lands here with their name, email and phone — ready for you to reply.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[19rem_1fr]">
          {/* Thread list */}
          <div
            role="listbox"
            aria-label="Conversations"
            className="flex max-h-[34rem] flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface-2 p-2"
          >
            {threads.map((t) => {
              const cutoff = t.adminReadAt ? new Date(t.adminReadAt).getTime() : 0;
              const unread = t.messages.filter(
                (m) => m.from === "customer" && new Date(m.at).getTime() > cutoff
              ).length;
              const last = t.messages[t.messages.length - 1];
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={activeThreadId === t.id}
                  onClick={() => selectThread(t.id)}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 ${
                    activeThreadId === t.id
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-foreground/10"
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-sm font-extrabold text-on-primary">
                    {t.customerName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-heading text-sm font-bold">{t.customerName}</span>
                      {unread > 0 && (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 px-1 text-[11px] font-bold text-primary-950 shadow-gold">
                          {Math.min(99, unread)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-foreground/55">
                      {last ? (last.from === "admin" ? `You: ${last.body}` : last.body) : "No messages yet"}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-foreground/40">
                      {t.customerEmail} ·{" "}
                      {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(t.updatedAt))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Conversation */}
          <div className="flex min-h-[34rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface-2">
            {!activeThread ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <MessageSquare className="h-10 w-10 text-foreground/25" aria-hidden="true" />
                <p className="font-heading text-lg font-bold">Pick a conversation</p>
                <p className="max-w-xs text-sm text-foreground/55">
                  Choose a thread on the left to read it and reply as{" "}
                  <strong>{user?.name ?? "the store"}</strong>.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-sm font-extrabold text-on-primary">
                      {activeThread.customerName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-heading font-bold">{activeThread.customerName}</p>
                      <p className="truncate text-xs text-foreground/55">
                        {activeThread.customerEmail} · {activeThread.customerPhone || "no phone"}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/${activeThread.customerPhone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline !px-3 !py-1.5 text-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                  </a>
                </div>

                <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-surface-2 p-4" aria-live="polite">
                  {activeThread.messages.map((m) =>
                    m.from === "customer" ? (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-primary-600 to-primary-800 px-4 py-2.5 text-sm text-on-primary shadow-soft">
                          <p className="whitespace-pre-wrap leading-snug">{m.body}</p>
                          <p className="mt-1 text-right text-[10px] font-semibold text-on-primary/60">
                            {m.senderName} ·{" "}
                            {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(m.at))}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground shadow-soft">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary-700">{m.senderName}</p>
                          <p className="mt-0.5 whitespace-pre-wrap leading-snug">{m.body}</p>
                          <p className="mt-1 text-right text-[10px] font-semibold text-foreground/45">
                            {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(m.at))}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <form onSubmit={handleReply} className="border-t border-border p-3">
                  <div className="flex items-end gap-2">
                    <label htmlFor="chat-reply" className="sr-only">Reply to the customer</label>
                    <textarea
                      id="chat-reply"
                      ref={inputRef}
                      rows={2}
                      className="input flex-1 resize-none !py-2.5"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={`Reply as ${user?.name ?? "Admin"}…`}
                      maxLength={600}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary !h-11 shrink-0 !px-4"
                      disabled={!reply.trim()}
                    >
                      <Send className="h-4 w-4" aria-hidden="true" /> Reply
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-foreground/45">
                    Replies are visible to the customer in the storefront chat bubble.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Users & roles                                                       */
/* ------------------------------------------------------------------ */

function RoleBadge({ role }: { role: "customer" | "admin" | "owner" }) {
  const styles = {
    owner: "bg-gold-100 text-gold-700 ring-gold-500/30",
    admin: "bg-primary/10 text-primary-700 ring-primary/30",
    customer: "bg-foreground/10 text-foreground/60 ring-border",
  };
  const labels = { owner: "Owner", admin: "Admin", customer: "Customer" };
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles[role]}`}>
      {labels[role]}
    </span>
  );
}

function UsersTab() {
  const { user: me, isOwner, users: accounts, updateUser, setUserRole, setUserBanned, deleteUser } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null); // delete
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function run(action: () => { ok: boolean; error?: string }, success: string) {
    setError(null);
    const result = action();
    if (!result.ok) {
      setError(result.error ?? "That action didn't work — try again.");
      return;
    }
    setNotice(success);
  }

  const sorted = useMemo(
    () => [...accounts].sort((a, b) => a.name.localeCompare(b.name)),
    [accounts]
  );
  const q = query.trim().toLowerCase();
  const filtered = q
    ? sorted.filter((a) => [a.name, a.email, a.phone ?? "", a.role].join(" ").toLowerCase().includes(q))
    : sorted;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Registered users</h2>
          <p className="text-sm text-foreground/55">
            {filtered.length} of {accounts.length} accounts shown · edit details, grant or
            revoke admin access, ban, or delete. Banned users are locked out immediately.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
          <label htmlFor="admin-user-search" className="sr-only">Search users</label>
          <input
            id="admin-user-search"
            type="search"
            className="input !pl-10"
            placeholder="Search name, email or role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}

      {!isOwner && (
        <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
          You&apos;re an admin — you can edit customers, ban or delete them, but only the store
          owner can assign or revoke admin roles.
        </p>
      )}

      {editingId && (
        <UserEditor
          key={editingId}
          account={accounts.find((a) => a.id === editingId) ?? null}
          onCancel={() => setEditingId(null)}
          onSave={(patch) => {
            const result = updateUser(editingId, patch);
            if (!result.ok) {
              setError(result.error ?? "Couldn't save those changes.");
              return;
            }
            setNotice("Account updated.");
            setEditingId(null);
          }}
        />
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
        {filtered.map((a) => {
          const isSelf = a.id === me?.id;
          const isOwnerRow = a.role === "owner";
          const canManageRole = isOwner && !isOwnerRow && !isSelf;
          const canBan = !isOwnerRow && !isSelf && (a.role !== "admin" || isOwner);
          return (
            <li key={a.id} className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center ${a.banned ? "opacity-70" : ""}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-sm font-extrabold text-on-primary">
                {a.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-heading text-sm font-bold">{a.name}</span>
                  <RoleBadge role={a.role} />
                  {a.banned && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive ring-1 ring-destructive/30">
                      Banned
                    </span>
                  )}
                  {isSelf && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-bold text-foreground/55">
                      You
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-foreground/55">
                  <span className="font-semibold">{a.email}</span>
                  {a.phone && <span>· {a.phone}</span>}
                  <span>· joined {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(a.createdAt))}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {confirming === a.id ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary !px-3 !py-1.5 text-xs"
                      onClick={() =>
                        run(() => {
                          const res = deleteUser(a.id);
                          if (res.ok) setConfirming(null);
                          return res;
                        }, `"${a.name}" deleted.`)
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Confirm delete
                    </button>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost !px-3 !py-1.5 text-xs"
                      onClick={() => {
                        setError(null);
                        setNotice(null);
                        setEditingId(a.id);
                      }}
                      aria-label={`Edit ${a.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </button>
                    {canManageRole && (
                      <button
                        type="button"
                        className={`btn !px-3 !py-1.5 text-xs ${a.role === "admin" ? "btn-ghost" : "btn-accent"}`}
                        onClick={() =>
                          run(() => {
                            const res = setUserRole(a.id, a.role === "admin" ? "customer" : "admin");
                            if (res.ok) setEditingId(null);
                            return res;
                          }, a.role === "admin" ? `Admin access revoked from ${a.name}.` : `${a.name} is now an admin.`)
                        }
                      >
                        <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                        {a.role === "admin" ? "Revoke admin" : "Make admin"}
                      </button>
                    )}
                    {canBan && (
                      <button
                        type="button"
                        className={`btn !px-3 !py-1.5 text-xs ${a.banned ? "btn-primary" : "btn-ghost text-destructive"}`}
                        onClick={() =>
                          run(
                            () => setUserBanned(a.id, !a.banned),
                            a.banned ? `${a.name} can sign in again.` : `${a.name} is banned and locked out.`
                          )
                        }
                      >
                        {a.banned ? "Unban" : "Ban"}
                      </button>
                    )}
                    {!isOwnerRow && !isSelf && (
                      <button
                        type="button"
                        className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                        onClick={() => {
                          setError(null);
                          setNotice(null);
                          setConfirming(a.id);
                        }}
                        aria-label={`Delete ${a.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {accounts.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/55">
          No registered accounts yet — when someone signs up on the storefront they appear here.
        </p>
      )}
      {accounts.length > 0 && filtered.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/55">
          No users match “{query.trim()}” — try a different name, email or phone.
        </p>
      )}
    </div>
  );
}

function UserEditor({
  account,
  onCancel,
  onSave,
}: {
  account: { id: string; name: string; email: string; phone?: string } | null;
  onCancel: () => void;
  onSave: (patch: { name: string; email: string; phone: string }) => void;
}) {
  const [form, setForm] = useState({
    name: account?.name ?? "",
    email: account?.email ?? "",
    phone: account?.phone ?? "",
  });
  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: form.name, email: form.email, phone: form.phone });
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold">Edit account {account?.name ? `— ${account.name}` : ""}</h3>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-2 text-foreground/55" aria-label="Close editor">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="ue-name" className="field-label">Full name</label>
          <input id="ue-name" className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label htmlFor="ue-email" className="field-label">Email</label>
          <input id="ue-email" type="email" className="input" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label htmlFor="ue-phone" className="field-label">Phone / WhatsApp</label>
          <input id="ue-phone" type="tel" className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xx…" />
        </div>
      </div>
      <div className="flex gap-3 border-t border-border pt-4">
        <button type="submit" className="btn btn-primary">
          <Check className="h-4 w-4" aria-hidden="true" /> Save changes
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const CONFIG_SECTIONS = [
  { id: "site", label: "Site settings", icon: Store },
  { id: "hero", label: "Homepage hero", icon: Home },
  { id: "logo", label: "Logo & branding", icon: Palette },
  { id: "journal", label: "Journal posts", icon: Newspaper },
  { id: "gateways", label: "Payment gateways", icon: Wallet },
  { id: "categories", label: "Product categories", icon: Tags },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "receipts", label: "Receipt & layout", icon: ReceiptText },
  { id: "sponsors", label: "Sponsors & ads", icon: Megaphone },
  { id: "pages", label: "Pages", icon: FileText },
] as const;

type ConfigSection = (typeof CONFIG_SECTIONS)[number]["id"];

function ConfigTab() {
  const [section, setSection] = useState<ConfigSection>("gateways");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Configuration</h2>
          <p className="text-sm text-foreground/55">
            Site settings, the homepage hero, gateways, coupons and more — every change goes
            live in the shop instantly.
          </p>
        </div>
      </div>

      <div role="group" aria-label="Configuration sections" className="flex flex-wrap gap-2">
        {CONFIG_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chip ${section === s.id ? "chip-active" : ""}`}
            onClick={() => setSection(s.id)}
          >
            <s.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </div>

      {section === "site" && <SiteSettingsPanel />}
      {section === "hero" && <HeroPanel />}
      {section === "logo" && <LogoPanel />}
      {section === "journal" && <JournalPanel />}
      {section === "gateways" && <GatewaysPanel />}
      {section === "categories" && <CategoriesPanel />}
      {section === "coupons" && <CouponsPanel />}
      {section === "receipts" && <ReceiptsPanel />}
      {section === "sponsors" && <SponsorsPanel />}
      {section === "pages" && <PagesPanel />}
    </div>
  );
}

function GatewaysPanel() {
  const { gateways, loading, refresh, setEnabled, remove } = useGateways();
  const [wizardSlug, setWizardSlug] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rowFor = (slug: string) => gateways.find((g) => g.slug === slug);
  const connectedCount = gateways.filter((g) => g.enabled).length;

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    setError(null);
    const res = await action();
    if (!res.ok) {
      setError(res.message ?? "That action didn't work — try again.");
      return;
    }
    setNotice(success);
    await refresh();
  }

  function statusBadge(entry: GatewayCatalogEntry) {
    const row = rowFor(entry.slug);
    if (!row || row.status === "not_configured") {
      return <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-bold text-foreground/55">Not connected</span>;
    }
    if (row.status === "connected" && row.enabled) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary-700">
          <Check className="h-3 w-3" aria-hidden="true" /> Connected · live
        </span>
      );
    }
    if (row.status === "connected" && !row.enabled) {
      return <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-bold text-foreground/55">Connected · paused</span>;
    }
    return <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">Connection error</span>;
  }

  return (
    <div className="space-y-5">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        Connect payment providers or set up manual methods. Connected gateways appear at checkout as
        payment options — you can pause them without losing their settings.
        {loading && <span className="ml-2 text-foreground/40">Syncing…</span>}
        {!loading && gateways.length === 0 && (
          <span className="ml-2 text-foreground/40">(database list not reachable — showing the local demo list)</span>
        )}
      </p>

      {/* Connected count */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary-700">
          {connectedCount} of {GATEWAY_CATALOG.length} gateways live
        </span>
      </div>

      {/* Available gateways */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GATEWAY_CATALOG.map((entry) => {
          const row = rowFor(entry.slug);
          const connected = !!row?.enabled && row.status === "connected";
          return (
            <div key={entry.slug} className="card flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-bold">{entry.name}</p>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-foreground/45">
                    {GATEWAY_TYPE_LABEL[entry.type]}
                  </p>
                </div>
                {statusBadge(entry)}
              </div>
              <p className="line-clamp-2 text-xs text-foreground/60">{entry.tagline}</p>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {connected ? (
                  <>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setWizardSlug(entry.slug)} aria-label={`Configure ${entry.name}`}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Configure
                    </button>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={row!.enabled}
                        onChange={(e) => void run(() => setEnabled(entry.slug, e.target.checked), e.target.checked ? `${entry.name} is live at checkout.` : `${entry.name} paused.`)}
                        className="h-4 w-4 accent-primary"
                      />
                      {row!.enabled ? "Live" : "Paused"}
                    </label>
                    {confirming === entry.slug ? (
                      <span className="ml-auto flex gap-1.5">
                        <button type="button" className="btn btn-primary !px-2.5 !py-1 text-xs" onClick={() => void run(() => remove(entry.slug), `${entry.name} disconnected.`)}>
                          Disconnect
                        </button>
                        <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setConfirming(null)}>
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost ml-auto !px-2 !py-1 text-xs text-destructive"
                        onClick={() => setConfirming(entry.slug)}
                        aria-label={`Disconnect ${entry.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className="btn btn-primary !px-3.5 !py-1.5 text-xs" onClick={() => setWizardSlug(entry.slug)}>
                    <PlugZapIcon className="h-3.5 w-3.5" aria-hidden="true" /> Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-foreground/50">
        API credentials are stored server-side only — they&apos;re never sent to your browser after saving,
        and shoppers only ever see the display details you configure.
      </p>

      {wizardSlug && (
        <GatewayWizard
          slug={wizardSlug}
          existing={rowFor(wizardSlug) ?? null}
          onClose={() => setWizardSlug(null)}
          onConnected={() => {
            setNotice(`Connected — ${GATEWAY_CATALOG.find((g) => g.slug === wizardSlug)?.name ?? wizardSlug} is live at checkout.`);
          }}
        />
      )}
    </div>
  );
}

function PlugZapIcon(props: { className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  return <PlugZap className={props.className} aria-hidden={props["aria-hidden"]} />;
}

function CategoriesPanel() {
  const { products } = useStore();
  const { categories, addCategory, updateCategory, deleteCategory } = useConfig();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const countFor = (id: string) => products.filter((p) => p.category === id).length;

  function remove(c: CategoryConfig) {
    const count = countFor(c.id);
    if (count > 0) {
      setNotice(`"${c.name}" still contains ${count} product${count === 1 ? "" : "s"} — delete or move them first.`);
      return;
    }
    deleteCategory(c.id);
    setConfirming(null);
    setNotice(`"${c.name}" deleted.`);
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        Deactivated categories disappear from the shop, home page and footer. A category that
        still has products must be emptied before it can be deleted.
      </p>
      {categories.map((c) => {
        const count = countFor(c.id);
        return (
          <div key={c.id} className="card grid gap-3 p-4 lg:grid-cols-[auto_1fr_1.2fr_auto_auto] lg:items-center">
            <label className="flex min-w-0 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={(e) => updateCategory(c.id, { enabled: e.target.checked })}
                className="h-4 w-4 shrink-0 accent-primary"
                aria-label={`${c.enabled ? "Deactivate" : "Activate"} ${c.name}`}
              />
              <span className={`truncate font-heading font-bold ${c.enabled ? "" : "text-foreground/40"}`}>{c.name}</span>
            </label>
            <label className="sr-only" htmlFor={`cat-blurb-${c.id}`}>Category blurb</label>
            <input
              id={`cat-blurb-${c.id}`}
              className="input !py-2 text-sm"
              value={c.blurb}
              onChange={(e) => updateCategory(c.id, { blurb: e.target.value })}
            />
            <label className="sr-only" htmlFor={`cat-img-${c.id}`}>Category image</label>
            <select
              id={`cat-img-${c.id}`}
              className="input !py-2 text-sm"
              value={c.image}
              onChange={(e) => updateCategory(c.id, { image: e.target.value })}
            >
              {IMAGE_OPTIONS.map((src) => (
                <option key={src} value={src}>{src.split("/").pop()}</option>
              ))}
            </select>
            <span className={`whitespace-nowrap text-xs font-bold ${count === 0 ? "text-foreground/40" : "text-primary-700"}`}>
              {count} product{count === 1 ? "" : "s"}
            </span>
            <div className="flex justify-end gap-2">
              {confirming === c.id ? (
                <>
                  <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => remove(c)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                  </button>
                  <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                  onClick={() => {
                    setNotice(null);
                    setConfirming(c.id);
                  }}
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="btn btn-outline"
        onClick={() => addCategory({ name: "New category", blurb: "Describe what lives here", image: IMAGE_OPTIONS[3] })}
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add category
      </button>
    </div>
  );
}

interface PageFormState {
  id: string | null;
  title: string;
  slug: string;
  content: string;
  enabled: boolean;
}

function PagesPanel() {
  const { pages, addPage, updatePage, deletePage } = useConfig();
  const [editing, setEditing] = useState<PageFormState | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function startNew() {
    setEditing({ id: null, title: "", slug: "", content: "", enabled: true });
    setNotice(null);
  }

  function startEdit(p: SitePage) {
    setEditing({ id: p.id, title: p.title, slug: p.slug, content: p.content, enabled: p.enabled });
    setNotice(null);
  }

  function save(form: PageFormState) {
    const title = form.title.trim();
    if (!title) {
      setNotice("Give the page a title first.");
      return;
    }
    const slug = slugify(form.slug.trim() || title);
    if (!slug) {
      setNotice("The page needs a URL slug (letters and dashes).");
      return;
    }
    if (pages.some((p) => p.slug === slug && p.id !== form.id)) {
      setNotice(`A page at "/page/${slug}" already exists — pick a different slug.`);
      return;
    }
    if (form.id) {
      updatePage(form.id, { title, slug, content: form.content.trim(), enabled: form.enabled });
      setNotice(`"${title}" saved.`);
    } else {
      addPage({ title, slug, content: form.content.trim(), enabled: form.enabled });
      setNotice(`"${title}" published at /page/${slug}.`);
    }
    setEditing(null);
  }

  function remove(p: SitePage) {
    deletePage(p.id);
    setConfirming(null);
    setNotice(`"${p.title}" deleted.`);
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        Enabled pages appear in the footer and at /page/slug. Disabled pages are hidden from
        visitors but kept for later.
      </p>
      {editing && <PageForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      {pages.map((p) => {
        const paras = p.content.split(/\n{2,}/).filter((s) => s.trim()).length;
        return (
          <div key={p.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <label className="flex shrink-0 cursor-pointer items-center gap-2.5 sm:w-40">
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) => updatePage(p.id, { enabled: e.target.checked })}
                className="h-4 w-4 accent-primary"
                aria-label={`${p.enabled ? "Hide" : "Show"} ${p.title}`}
              />
              <span className={`text-xs font-bold ${p.enabled ? "text-primary-700" : "text-foreground/40"}`}>
                {p.enabled ? "Visible" : "Hidden"}
              </span>
            </label>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-bold">{p.title}</p>
              <p className="text-xs text-foreground/55">
                /page/{p.slug} · {paras} paragraph{paras === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {confirming === p.id ? (
                <>
                  <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => remove(p)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                  </button>
                  <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => startEdit(p)} aria-label={`Edit ${p.title}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                    onClick={() => {
                      setNotice(null);
                      setConfirming(p.id);
                    }}
                    aria-label={`Delete ${p.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
      <button type="button" className="btn btn-outline" onClick={startNew}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Add page
      </button>
    </div>
  );
}

function PageForm({ initial, onSave, onCancel }: { initial: PageFormState; onSave: (f: PageFormState) => void; onCancel: () => void }) {
  const [form, setForm] = useState<PageFormState>(initial);
  const set = <K extends keyof PageFormState>(key: K, value: PageFormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold">{form.id ? `Edit: ${form.title || "untitled page"}` : "New page"}</h3>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-2 text-foreground/55" aria-label="Close page form">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-title" className="field-label">Page title *</label>
          <input id="pf-title" className="input" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Size guide" />
        </div>
        <div>
          <label htmlFor="pf-slug" className="field-label">URL slug</label>
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-xs font-semibold text-foreground/45">/page/</span>
            <input id="pf-slug" className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="size-guide" />
          </div>
          <p className="mt-1 text-xs text-foreground/50">Lowercase letters and dashes — leave blank to auto-generate from the title.</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pf-content" className="field-label">Content</label>
          <textarea id="pf-content" rows={6} className="input" value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Write the page here…" />
          <p className="mt-1 text-xs text-foreground/50">A blank line starts a new paragraph.</p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
        <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 accent-primary" />
        Visible on the site
      </label>

      <div className="flex gap-3 border-t border-border pt-4">
        <button type="submit" className="btn btn-primary">
          <Check className="h-4 w-4" aria-hidden="true" /> Save page
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Sponsors & ads                                                      */
/* ------------------------------------------------------------------ */

function SponsorsPanel() {
  const { sponsors, addSponsor, updateSponsor, deleteSponsor } = useConfig();
  const { products } = useStore();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [placement, setPlacement] = useState<SponsorPlacement>("home_hero");
  const [externalUrl, setExternalUrl] = useState("");
  const [productId, setProductId] = useState("");
  const [image, setImage] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function resizeToDataUrl(file: File, cb: (dataUrl: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cb("");
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => cb("");
    reader.readAsDataURL(file);
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) resizeToDataUrl(file, (url) => setImage(url));
  }

  function resetForm() {
    setName("");
    setTagline("");
    setExternalUrl("");
    setProductId("");
    setImage("");
  }

  function save() {
    if (!name.trim()) {
      setNotice("Give the sponsor a name.");
      return;
    }
    if (productId && externalUrl.trim()) {
      setNotice("Choose one link — either a product or an external URL, not both.");
      return;
    }
    addSponsor({
      name,
      tagline: tagline.trim() || undefined,
      placement,
      externalUrl: externalUrl.trim() || undefined,
      productId: productId || undefined,
      image: image || "",
    });
    setNotice(`"${name.trim()}" is live on the shop.`);
    resetForm();
  }

  const placementLabel = (id: SponsorPlacement) =>
    SPONSOR_PLACEMENTS.find((p) => p.id === id)?.label ?? id;

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        Partner banners shown under the homepage hero, below the shop grid, and above the footer.
        Upload an image (it&apos;s resized in the browser) or link straight to a product.
      </p>

      {/* Add form */}
      <form
        className="card space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h3 className="font-heading font-bold">Add sponsor</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sp-name" className="field-label">Name *</label>
            <input id="sp-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Predator Cues" />
          </div>
          <div>
            <label htmlFor="sp-tag" className="field-label">Tagline</label>
            <input id="sp-tag" className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tournament-grade shafts" />
          </div>
          <div>
            <label htmlFor="sp-placement" className="field-label">Placement</label>
            <select id="sp-placement" className="input" value={placement} onChange={(e) => setPlacement(e.target.value as SponsorPlacement)}>
              {SPONSOR_PLACEMENTS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sp-product" className="field-label">Link to a product (optional)</label>
            <select id="sp-product" className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">— no product link —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sp-url" className="field-label">External URL (optional)</label>
            <input
              id="sp-url"
              type="url"
              className="input"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://… (http(s), whatsapp or tel only)"
            />
          </div>
          <div className="sm:col-span-2">
            <span className="field-label">Image (optional)</span>
            <div className="flex items-center gap-3">
              {image ? (
                <img src={image} alt="" className="h-12 w-12 rounded-xl border border-border object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-foreground/10 text-foreground/40">
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <label className="btn btn-outline !py-2 text-sm cursor-pointer">
                <ImagePlus className="h-4 w-4" aria-hidden="true" /> Choose image
                <input id="sp-image" type="file" accept="image/*" className="sr-only" onChange={handleImageFile} />
              </label>
              {image && (
                <button type="button" className="btn btn-ghost !py-2 text-sm" onClick={() => setImage("")}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-border pt-4">
          <button type="submit" className="btn btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add sponsor
          </button>
        </div>
      </form>

      {/* List */}
      {sponsors.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/55">
          No sponsors yet — add the first one above and it appears on the shop instantly.
        </p>
      ) : (
        sponsors.map((s) => (
          <div key={s.id} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
            {s.image ? (
              <img src={s.image} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-700">
                <Megaphone className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-bold">
                {s.name}
                {!s.enabled && <span className="ml-2 text-foreground/40">(paused)</span>}
              </p>
              <p className="truncate text-xs text-foreground/55">{s.tagline || "—"}</p>
              <p className="text-xs text-foreground/45">
                {placementLabel(s.placement)}
                {s.productId ? " · links to a product" : s.externalUrl ? " · external link" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) => updateSponsor(s.id, { enabled: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                {s.enabled ? "Live" : "Paused"}
              </label>
              {confirming === s.id ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary !px-3 !py-1.5 text-xs"
                    onClick={() => {
                      deleteSponsor(s.id);
                      setConfirming(null);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                  </button>
                  <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                  onClick={() => setConfirming(s.id)}
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Coupons (discount codes)                                            */
/* ------------------------------------------------------------------ */

interface CouponFormState {
  id?: string;
  code: string;
  title: string;
  type: CouponType;
  value: string;
  minimumSpend: string;
  maximumDiscount: string;
  validFrom: string; // yyyy-mm-ddThh:mm
  validUntil: string;
  usageLimit: string;
  perUserLimit: string;
  active: boolean;
}

const EMPTY_COUPON: CouponFormState = {
  code: "",
  title: "",
  type: "percent",
  value: "",
  minimumSpend: "0",
  maximumDiscount: "",
  validFrom: "",
  validUntil: "",
  usageLimit: "",
  perUserLimit: "1",
  active: true,
};

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

function coupleFromForm(f: CouponFormState): NewCoupon {
  return {
    id: f.id,
    code: f.code,
    title: f.title,
    type: f.type,
    value: Math.max(1, Number(f.value) || 0),
    minimumSpend: Math.max(0, Number(f.minimumSpend) || 0),
    maximumDiscount: f.maximumDiscount ? Math.max(0, Number(f.maximumDiscount) || 0) : undefined,
    validFrom: toIso(f.validFrom),
    validUntil: toIso(f.validUntil),
    usageLimit: f.usageLimit ? Math.max(1, Math.round(Number(f.usageLimit) || 0)) : undefined,
    perUserLimit: Math.max(1, Math.round(Number(f.perUserLimit) || 1)),
    active: f.active,
  };
}

function CouponsPanel() {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useCoupons();
  const [form, setForm] = useState<CouponFormState>(EMPTY_COUPON);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CouponFormState>(key: K, value: CouponFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function startNew() {
    setForm(EMPTY_COUPON);
    setEditingId(null);
    setNotice(null);
    setError(null);
  }

  function startEdit(c: Coupon) {
    setForm({
      id: c.id,
      code: c.code,
      title: c.title,
      type: c.type,
      value: String(c.value),
      minimumSpend: String(c.minimumSpend ?? 0),
      maximumDiscount: c.maximumDiscount != null ? String(c.maximumDiscount) : "",
      validFrom: toLocalInput(c.validFrom),
      validUntil: toLocalInput(c.validUntil),
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
      perUserLimit: String(c.perUserLimit),
      active: c.active,
    });
    setEditingId(c.id);
    setNotice(null);
    setError(null);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const code = normalizeCode(form.code);
    if (!code) {
      setError("Give the coupon a code — letters and digits, e.g. WELCOME10.");
      return;
    }
    const value = Number(form.value);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Set a discount value above 0 (percentage or Rupiah, depending on type).");
      return;
    }
    if (form.type === "percent" && (value <= 0 || value > 100)) {
      setError("A percent coupon must be between 1 and 100.");
      return;
    }
    if (form.validFrom && form.validUntil && new Date(form.validFrom) > new Date(form.validUntil)) {
      setError("The coupon can't end before it starts — fix the dates.");
      return;
    }
    if (editingId) {
      updateCoupon(editingId, coupleFromForm(form));
      setNotice(`"${code}" updated — shoppers see the changes instantly.`);
      setEditingId(null);
    } else {
      const created = addCoupon(coupleFromForm({ ...form, code }));
      if (!created) {
        setError(`A coupon with the code "${code}" already exists.`);
        return;
      }
      setNotice(`"${code}" is live — shoppers can apply it at checkout.`);
      setEditingId(null);
    }
    setForm(EMPTY_COUPON);
  }

  function remove(c: Coupon) {
    deleteCoupon(c.id);
    setConfirming(null);
    setNotice(`"${c.code}" deleted.`);
  }

  const setFormCouponType = (t: CouponType) => set("type", t);

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        Customers type a code at checkout. A coupon can be a percentage or a fixed Rupiah amount,
        with optional minimum spend, caps, dates and usage limits.
      </p>

      {/* Add / edit form */}
      <form className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3" onSubmit={save}>
        <div>
          <label htmlFor="cp-code" className="field-label">Code *</label>
          <input id="cp-code" className="input uppercase" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="WELCOME10" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="cp-title" className="field-label">Label</label>
          <input id="cp-title" className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Welcome 10%" />
        </div>
        <div>
          <span className="field-label">Type</span>
          <div role="radiogroup" aria-label="Coupon type" className="flex gap-2">
            {(["percent", "fixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${form.type === t ? "chip-active" : ""}`}
                onClick={() => setFormCouponType(t)}
              >
                {t === "percent" ? "% Percent" : "Rp Fixed"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="cp-value" className="field-label">{form.type === "percent" ? "Percent off" : "Amount off (Rp)"} *</label>
          <input id="cp-value" type="number" min="1" step={form.type === "percent" ? "1" : "1000"} className="input" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder={form.type === "percent" ? "10" : "50000"} />
        </div>
        <div>
          <label htmlFor="cp-min" className="field-label">Minimum spend (Rp)</label>
          <input id="cp-min" type="number" min="0" step="10000" className="input" value={form.minimumSpend} onChange={(e) => set("minimumSpend", e.target.value)} />
        </div>
        <div>
          <label htmlFor="cp-max" className="field-label">{form.type === "percent" ? "Max discount (Rp)" : "Maximum per order (Rp, optional)"}</label>
          <input id="cp-max" type="number" min="0" step="5000" className="input" value={form.maximumDiscount} onChange={(e) => set("maximumDiscount", e.target.value)} placeholder="e.g. 100000" />
        </div>
        <div>
          <label htmlFor="cp-from" className="field-label">Valid from</label>
          <input id="cp-from" type="datetime-local" className="input" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
        </div>
        <div>
          <label htmlFor="cp-until" className="field-label">Valid until</label>
          <input id="cp-until" type="datetime-local" className="input" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
        </div>
        <div>
          <label htmlFor="cp-limit" className="field-label">Total usage limit</label>
          <input id="cp-limit" type="number" min="0" className="input" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="no limit" />
        </div>
        <div>
          <label htmlFor="cp-per" className="field-label">Per-email limit</label>
          <input id="cp-per" type="number" min="1" className="input" value={form.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} />
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
            <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-primary" />
            Active — redeemable at checkout
          </label>
        </div>
        <div className="flex gap-3 border-t border-border pt-4 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="btn btn-primary">
            <Check className="h-4 w-4" aria-hidden="true" /> {editingId ? "Save coupon" : "Create coupon"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline" onClick={startNew}>Cancel edit</button>
          )}
        </div>
      </form>

      {/* List */}
      {coupons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/55">
          No coupons yet — create the first one above and it&apos;s redeemable at checkout instantly.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
          {coupons.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-700">
                <Ticket className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-sm font-bold">{c.code}</span>
                  {!c.active && (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-bold text-foreground/50">paused</span>
                  )}
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-gold-700">
                    {c.type === "percent" ? `${c.value}% off` : formatIDR(c.value) + " off"}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-foreground/55">
                  {c.title}
                  {c.minimumSpend > 0 && ` · min ${formatIDR(c.minimumSpend)}`}
                  {c.maximumDiscount && ` · cap ${formatIDR(c.maximumDiscount)}`}
                  {c.validUntil && ` · ends ${new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(new Date(c.validUntil))}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`text-xs font-bold ${c.usedCount > 0 ? "text-primary-700" : "text-foreground/40"}`}>
                  {c.usedCount} use{c.usedCount === 1 ? "" : "s"}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                </span>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={c.active}
                    onChange={(e) => updateCoupon(c.id, { active: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  {c.active ? "Live" : "Paused"}
                </label>
                <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => startEdit(c)} aria-label={`Edit ${c.code}`}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
                {confirming === c.id ? (
                  <>
                    <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => remove(c)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                    </button>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>Keep</button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                    onClick={() => { setNotice(null); setConfirming(c.id); }}
                    aria-label={`Delete ${c.code}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Receipts & layout (printable receipt settings)                      */
/* ------------------------------------------------------------------ */

function ReceiptsPanel() {
  const { receipts, settings, updateSettings, resetSettings } = useReceipts();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const FIELDS: { key: keyof ReceiptSettingsConfig; label: string; hint?: string; type?: string; full?: boolean }[] = [
    { key: "storeName", label: "Store name" },
    { key: "tagline", label: "Tagline", full: true },
    { key: "address", label: "Address", full: true },
    { key: "phone", label: "Phone" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "email", label: "Email" },
    { key: "receiptPrefix", label: "Receipt number prefix", hint: 'e.g. "INV" → INV-2026-0001' },
    { key: "footerNote", label: "Footer note", full: true, hint: "Shown at the bottom of every receipt." },
  ];

  const setField = (key: keyof ReceiptSettingsConfig, value: string) =>
    updateSettings({ [key]: value });

  return (
    <div className="space-y-4">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        A receipt is generated automatically for every order and customers can save/print it from{" "}
        <span className="font-bold text-foreground/70">/receipt/&lt;order&gt;</span>. The details below
        fill the receipt header, footer and the downloaded copy.
      </p>

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
            <label htmlFor={`rs-${f.key}`} className="field-label">{f.label}</label>
            <input
              id={`rs-${f.key}`}
              type={f.type ?? "text"}
              className="input"
              value={settings[f.key] as string}
              onChange={(e) => setField(f.key, e.target.value)}
            />
            {f.hint && <p className="mt-1 text-xs text-foreground/50">{f.hint}</p>}
          </div>
        ))}
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80 sm:col-span-2">
          <input
            type="checkbox"
            checked={settings.showStatus}
            onChange={(e) => updateSettings({ showStatus: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Show the payment status badge on the receipt
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => { setNotice("Receipt layout saved — new receipts use these details."); }}>
          <Check className="h-4 w-4" aria-hidden="true" /> Save layout
        </button>
        {confirmReset ? (
          <>
            <button type="button" className="btn btn-primary !bg-destructive !px-3.5 !py-2 text-xs" onClick={() => { resetSettings(); setConfirmReset(false); setNotice("Back to the default receipt layout."); }}>
              Yes, reset
            </button>
            <button type="button" className="btn btn-ghost !px-3 !py-2 text-xs" onClick={() => setConfirmReset(false)}>Keep</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost text-destructive" onClick={() => setConfirmReset(true)}>
            Reset to defaults
          </button>
        )}
        {receipts.length > 0 && (
          <Link to={`/receipt/${encodeURIComponent(receipts[0].data.orderId)}`} className="btn btn-outline ml-auto !hidden sm:inline-flex">
            <ReceiptText className="h-4 w-4" aria-hidden="true" /> Preview
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 p-4">
        <h3 className="font-heading text-sm font-bold">Generated receipts</h3>
        {receipts.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/55">
            None yet — the first order placed at checkout auto-generates receipt{" "}
            <span className="font-mono font-bold text-primary-700">{settings.receiptPrefix}-{new Date().getFullYear()}-0001</span>.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {receipts.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-bold">{r.number}</span>
                  <span className="ml-2 text-foreground/50">{r.orderId}</span>
                </span>
                <Link to={`/receipt/${encodeURIComponent(r.data.orderId)}`} className="btn btn-ghost !px-3 !py-1 text-xs">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Homepage hero (text + carousel photos)                              */
/* ------------------------------------------------------------------ */

function HeroPanel() {
  const { siteConfig, updateSiteConfig } = useConfig();
  const hero = siteConfig.hero;
  const [pickedUrl, setPickedUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const setHero = (patch: Partial<HeroConfig>) =>
    updateSiteConfig({ hero: { ...hero, ...patch } });

  function resizeToDataUrl(file: File, cb: (dataUrl: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cb("");
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => cb("");
    reader.readAsDataURL(file);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    resizeToDataUrl(file, (url) => {
      if (!url) {
        setNotice("That image couldn't be read — try a PNG or JPG.");
        return;
      }
      setHero({ images: [...hero.images, url] });
      setNotice(null);
    });
    e.target.value = "";
  }

  function addUrl() {
    const url = pickedUrl.trim();
    if (!/^(https?:\/\/|\/)/i.test(url)) {
      setNotice("Paste a full image URL (https://…) or a site path to add it as a slide.");
      return;
    }
    setHero({ images: [...hero.images, url] });
    setPickedUrl("");
    setNotice(null);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= hero.images.length) return;
    const images = [...hero.images];
    [images[i], images[j]] = [images[j], images[i]];
    setHero({ images });
  }

  return (
    <div className="space-y-5">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        Edit the headline and paragraph on the homepage hero, and set the showroom photos. Text
        changes go live instantly — images are stored with the rest of the site config.
      </p>

      {/* Text */}
      <div className="card space-y-4 p-5">
        <h3 className="font-heading font-bold">Hero text</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hero-badge" className="field-label">Badge line</label>
            <input id="hero-badge" className="input" value={hero.badge} onChange={(e) => setHero({ badge: e.target.value })} placeholder="ISAK Billiard Co. — Jakarta" />
          </div>
          <div className="hidden sm:block" aria-hidden="true" />
          <div>
            <label htmlFor="hero-title1" className="field-label">Headline — first line</label>
            <input id="hero-title1" className="input" value={hero.titleLine1} onChange={(e) => setHero({ titleLine1: e.target.value })} placeholder="Play serious." />
          </div>
          <div>
            <label htmlFor="hero-title2" className="field-label">Headline — second line</label>
            <input id="hero-title2" className="input" value={hero.titleLine2} onChange={(e) => setHero({ titleLine2: e.target.value })} placeholder="Gear smarter." />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="hero-text" className="field-label">Supporting text</label>
            <textarea id="hero-text" rows={2} className="input resize-none" value={hero.text} onChange={(e) => setHero({ text: e.target.value })} placeholder="One or two sentences under the headline…" />
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-2xl border border-border bg-foreground/10 p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-700">
            {hero.badge || "Your badge"}
          </p>
          <p className="font-heading text-2xl font-bold leading-tight tracking-tight">
            {hero.titleLine1 || "Headline"}
            <span className="block italic text-gradient-deep">{hero.titleLine2 || "…"}</span>
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-foreground/65">
            {hero.text || "Supporting text…"}
          </p>
        </div>
      </div>

      {/* Images */}
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold">Hero photos</h3>
            <p className="text-xs text-foreground/55">
              {hero.images.length} slide{hero.images.length === 1 ? "" : "s"} — the carousel rotates
              every 6 seconds, and the first slide is the primary image.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn btn-outline !py-2 text-sm cursor-pointer">
              <ImagePlus className="h-4 w-4" aria-hidden="true" /> Upload photo
              <input id="hero-file" type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
            </label>
            <div className="flex items-center gap-1.5">
              <input
                aria-label="Hero image URL"
                type="text"
                className="input !w-56 !py-2 text-sm"
                placeholder="https://… image URL"
                value={pickedUrl}
                onChange={(e) => setPickedUrl(e.target.value)}
              />
              <button type="button" className="btn btn-primary !py-2 text-sm" onClick={addUrl}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add
              </button>
            </div>
          </div>
        </div>

        {hero.images.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-foreground/55">
            No photos yet — upload one above and it becomes the hero image.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {hero.images.map((src, i) => (
              <li key={`${src}-${i}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3">
                <span className="relative shrink-0">
                  <img src={src} alt={`Hero slide ${i + 1}`} className="h-16 w-24 rounded-xl border border-border bg-foreground/10 object-cover" />
                  {i === 0 && (
                    <span className="absolute -left-1.5 -top-1.5 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 px-1.5 py-0.5 text-[9px] font-extrabold text-primary-950 shadow-gold">
                      FIRST
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">Slide {i + 1}</span>
                  <span className="block truncate text-[11px] text-foreground/50">
                    {src.startsWith("data:") ? "Uploaded photo" : src}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <button type="button" className="btn btn-ghost !h-9 !w-9 !px-0" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move slide ${i + 1} left`}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn-ghost !h-9 !w-9 !px-0" disabled={i === hero.images.length - 1} onClick={() => move(i, 1)} aria-label={`Move slide ${i + 1} right`}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !h-9 !w-9 !px-0 text-destructive"
                    disabled={hero.images.length === 1}
                    onClick={() => setHero({ images: hero.images.filter((_, j) => j !== i) })}
                    aria-label={`Remove slide ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <label className="text-xs font-semibold text-foreground/60" htmlFor="hero-placeholder-pick">
            Or add a built-in cover:
          </label>
          <select
            id="hero-placeholder-pick"
            aria-label="Add a built-in hero image"
            className="input !w-56 !py-2 text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) setHero({ images: [...hero.images, e.target.value] });
            }}
          >
            <option value="">— choose one —</option>
            {IMAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.split("/").pop()}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost ml-auto !py-2 text-sm"
            onClick={() => {
              updateSiteConfig({ hero: DEFAULT_HERO });
              setNotice("Hero restored to the original design — refreshed on the homepage.");
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset hero
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Site settings (contact info, socials, shop links)                   */
/* ------------------------------------------------------------------ */

type SiteTextField = "phone" | "whatsapp" | "email" | "address" | "hours" | "mapEmbedUrl" | "announcement";

function SiteSettingsPanel() {
  const {
    siteConfig,
    updateSiteConfig,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    addShopLink,
    updateShopLink,
    deleteShopLink,
  } = useConfig();
  const [newSocial, setNewSocial] = useState<{ platform: SocialPlatform; label: string; url: string }>({
    platform: "instagram",
    label: "",
    url: "",
  });
  const [newShop, setNewShop] = useState({ label: "", url: "" });
  const [confirmingSocial, setConfirmingSocial] = useState<string | null>(null);
  const [confirmingShop, setConfirmingShop] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = (key: SiteTextField, value: string) => updateSiteConfig({ [key]: value });

  function addSocial() {
    if (!newSocial.url.trim()) {
      setNotice("Social links need a URL.");
      return;
    }
    addSocialLink(newSocial);
    setNewSocial({ platform: newSocial.platform, label: "", url: "" });
    setNotice("Social link added — it appears in the footer instantly.");
  }

  function addShop() {
    if (!newShop.label.trim() || !newShop.url.trim()) {
      setNotice("Store links need both a label and a URL.");
      return;
    }
    addShopLink(newShop);
    setNewShop({ label: "", url: "" });
    setNotice("Store link added — shown in the footer and contact page.");
  }

  const FIELDS: { key: SiteTextField; label: string; type?: string; hint?: string; full?: boolean }[] = [
    { key: "phone", label: "Phone", hint: "Shown in the footer & contact page (tap-to-call)." },
    { key: "whatsapp", label: "WhatsApp number", hint: "Opens a chat on the contact page." },
    { key: "email", label: "Email", hint: "Footer & contact page mailto link." },
    { key: "address", label: "Address", hint: "Footer & contact page." },
    { key: "hours", label: "Opening hours", hint: "Shown under the address." },
    { key: "mapEmbedUrl", label: "Google Maps embed URL", full: true, hint: "The iframe src for the contact page (must be a https://google.com/maps… embed link)." },
    { key: "announcement", label: "Announcement bar text", full: true, hint: "Use {threshold} to insert the free-shipping amount, e.g. \"Free shipping above {threshold}\"." },
  ];

  return (
    <div className="space-y-5">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        Contact details, social profiles and official-store links — changes go live in the header,
        footer and contact page instantly.
      </p>

      {/* Contact fields */}
      <div className="card space-y-4 p-5">
        <h3 className="font-heading font-bold">Contact details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
              <label htmlFor={`site-${f.key}`} className="field-label">{f.label}</label>
              <input
                id={`site-${f.key}`}
                className="input"
                value={siteConfig[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.type === "url" ? "https://…" : undefined}
              />
              {f.hint && <p className="mt-1 text-xs text-foreground/50">{f.hint}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Social links */}
      <div className="card space-y-4 p-5">
        <h3 className="font-heading font-bold">Social media links</h3>
        <form
          className="grid gap-3 sm:grid-cols-[11rem_1fr_1.4fr_auto] sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            addSocial();
          }}
        >
          <div>
            <label htmlFor="ns-platform" className="sr-only">Platform</label>
            <select
              id="ns-platform"
              className="input !py-2 text-sm"
              value={newSocial.platform}
              onChange={(e) => setNewSocial((s) => ({ ...s, platform: e.target.value as SocialPlatform }))}
            >
              {SOCIAL_CATALOG.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ns-label" className="sr-only">Display label</label>
            <input
              id="ns-label"
              className="input !py-2 text-sm"
              value={newSocial.label}
              onChange={(e) => setNewSocial((s) => ({ ...s, label: e.target.value }))}
              placeholder="Label (optional)"
            />
          </div>
          <div>
            <label htmlFor="ns-url" className="sr-only">Profile URL</label>
            <input
              id="ns-url"
              type="url"
              className="input !py-2 text-sm"
              value={newSocial.url}
              onChange={(e) => setNewSocial((s) => ({ ...s, url: e.target.value }))}
              placeholder="https://instagram.com/…"
            />
          </div>
          <button type="submit" className="btn btn-primary !px-3.5 !py-2 text-sm">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </button>
        </form>

        {siteConfig.socials.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-foreground/55">
            No social links yet — add the first one above.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {siteConfig.socials.map((s: SocialLink) => (
              <li key={s.id} className="flex flex-col gap-2.5 px-4 py-3 lg:flex-row lg:items-center">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-700">
                  <SocialPlatformIcon platform={s.platform} className="h-4 w-4" />
                </span>
                <select
                  aria-label={`Platform for ${s.label || s.platform}`}
                  className="input !w-auto !py-2 text-sm"
                  value={s.platform}
                  onChange={(e) => updateSocialLink(s.id, { platform: e.target.value as SocialPlatform })}
                >
                  {SOCIAL_CATALOG.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <input
                  aria-label="Social link label"
                  className="input !py-2 text-sm"
                  value={s.label}
                  onChange={(e) => updateSocialLink(s.id, { label: e.target.value })}
                />
                <input
                  aria-label="Social link URL"
                  type="url"
                  className="input !py-2 text-sm lg:flex-1"
                  value={s.url}
                  onChange={(e) => updateSocialLink(s.id, { url: e.target.value })}
                />
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => updateSocialLink(s.id, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  {s.enabled ? "Visible" : "Hidden"}
                </label>
                {confirmingSocial === s.id ? (
                  <span className="flex gap-1.5">
                    <button type="button" className="btn btn-primary !px-2.5 !py-1 text-xs" onClick={() => { deleteSocialLink(s.id); setConfirmingSocial(null); }}>
                      Delete
                    </button>
                    <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setConfirmingSocial(null)}>Keep</button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !px-2 !py-1 text-xs text-destructive"
                    onClick={() => setConfirmingSocial(s.id)}
                    aria-label={`Delete ${s.label || s.platform}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Shop links */}
      <div className="card space-y-4 p-5">
        <h3 className="font-heading font-bold">Official store links</h3>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            addShop();
          }}
        >
          <div>
            <label htmlFor="nshop-label" className="sr-only">Store label</label>
            <input
              id="nshop-label"
              className="input !py-2 text-sm"
              value={newShop.label}
              onChange={(e) => setNewShop((s) => ({ ...s, label: e.target.value }))}
              placeholder="Store name (e.g. Shopee)"
            />
          </div>
          <div>
            <label htmlFor="nshop-url" className="sr-only">Store URL</label>
            <input
              id="nshop-url"
              type="url"
              className="input !py-2 text-sm"
              value={newShop.url}
              onChange={(e) => setNewShop((s) => ({ ...s, url: e.target.value }))}
              placeholder="https://shopee.co.id/…"
            />
          </div>
          <button type="submit" className="btn btn-primary !px-3.5 !py-2 text-sm">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </button>
        </form>

        {siteConfig.shopLinks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-foreground/55">
            No store links yet — add Shopee, Tokopedia or any partner store above.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {siteConfig.shopLinks.map((s: ShopLink) => (
              <li key={s.id} className="flex flex-col gap-2.5 px-4 py-3 lg:flex-row lg:items-center">
                <input
                  aria-label="Store label"
                  className="input !py-2 text-sm lg:w-52"
                  value={s.label}
                  onChange={(e) => updateShopLink(s.id, { label: e.target.value })}
                />
                <input
                  aria-label="Store URL"
                  type="url"
                  className="input !py-2 text-sm lg:flex-1"
                  value={s.url}
                  onChange={(e) => updateShopLink(s.id, { url: e.target.value })}
                />
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => updateShopLink(s.id, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  {s.enabled ? "Visible" : "Hidden"}
                </label>
                {confirmingShop === s.id ? (
                  <span className="flex gap-1.5">
                    <button type="button" className="btn btn-primary !px-2.5 !py-1 text-xs" onClick={() => { deleteShopLink(s.id); setConfirmingShop(null); }}>
                      Delete
                    </button>
                    <button type="button" className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setConfirmingShop(null)}>Keep</button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !px-2 !py-1 text-xs text-destructive"
                    onClick={() => setConfirmingShop(s.id)}
                    aria-label={`Delete ${s.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Logo & branding                                                     */
/* ------------------------------------------------------------------ */

function LogoPanel() {
  const { logo, updateLogo } = useConfig();
  const [notice, setNotice] = useState<string | null>(null);

  function resizeToDataUrl(file: File, cb: (dataUrl: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 256;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cb("");
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL("image/png"));
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => cb("");
    reader.readAsDataURL(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    resizeToDataUrl(file, (url) => {
      if (!url) {
        setNotice("That image couldn't be read — try a PNG or JPG.");
        return;
      }
      updateLogo(url);
      setNotice("Logo updated — it now appears in the header, footer and auth dialog.");
    });
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <p className="rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
        Change the icon/logo that appears in the header, footer and the sign-in dialog. The image
        is resized in your browser and stored with the rest of the site configuration.
      </p>

      <div className="card flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
        <img
          src={logo}
          alt="Current site logo"
          className="h-28 w-28 shrink-0 rounded-2xl border border-border bg-white object-contain p-1.5 shadow-soft"
        />
        <div className="flex flex-col items-start gap-2.5">
          <label className="btn btn-primary cursor-pointer">
            <ImagePlus className="h-4 w-4" aria-hidden="true" /> Upload new logo
            <input id="logo-file" type="file" accept="image/*" className="sr-only" onChange={handleFile} />
          </label>
          <button type="button" className="btn btn-ghost !py-2 text-sm" onClick={() => { updateLogo(BRAND_LOGO); setNotice("Back to the original logo."); }}>
            Reset to original
          </button>
          <p className="text-xs text-foreground/50">
            PNG or JPG, ideally square. Stored in this browser — a production deployment would
            upload to storage instead.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Journal / blog posts                                                */
/* ------------------------------------------------------------------ */

interface PostFormState {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  image: string;
  content: string;
  readMinutes: string;
  videoUrl: string;
  published: boolean;
}

function JournalPanel() {
  const { posts, addPost, updatePost, deletePost } = useConfig();
  const [editing, setEditing] = useState<PostFormState | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function startNew() {
    setEditing({
      slug: "",
      title: "",
      excerpt: "",
      author: "ISAK Billiard Co.",
      date: new Date().toISOString().slice(0, 10),
      category: "Journal",
      image: IMAGE_OPTIONS[0],
      content: "",
      readMinutes: "",
      videoUrl: "",
      published: true,
    });
    setNotice(null);
  }

  function startEdit(p: BlogPost) {
    setEditing({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      author: p.author,
      date: p.date,
      category: p.category,
      image: p.image,
      content: p.content.join("\n\n"),
      readMinutes: String(p.readMinutes),
      videoUrl: p.videoUrl ?? "",
      published: p.published,
    });
    setNotice(null);
  }

  function save(form: PostFormState) {
    const title = form.title.trim();
    if (!title) {
      setNotice("Give the post a title first.");
      return;
    }
    const content = form.content.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    if (content.length === 0) {
      setNotice("Write at least one paragraph of content.");
      return;
    }
    const base: Partial<BlogPost> = {
      title,
      excerpt: form.excerpt.trim(),
      author: form.author.trim() || "ISAK Billiard Co.",
      date: form.date || new Date().toISOString().slice(0, 10),
      category: form.category.trim() || "Journal",
      image: form.image,
      content,
      readMinutes: Math.max(1, Math.round(Number(form.readMinutes) || content.join(" ").length / 900)),
      videoUrl: form.videoUrl.trim() || undefined,
      published: form.published,
    };
    if (editing?.slug && posts.some((p) => p.slug === editing.slug)) {
      updatePost(editing.slug, base);
      setNotice(`"${title}" saved.`);
    } else {
      const created = addPost({ ...base, slug: form.slug.trim() || undefined } as Pick<BlogPost, "title" | "content"> & Partial<BlogPost>);
      if (!created) {
        setNotice("Couldn't create that post.");
        return;
      }
      setNotice(`"${title}" published at /blog/${created.slug}.`);
    }
    setEditing(null);
  }

  function remove(slug: string) {
    deletePost(slug);
    setConfirming(null);
    setNotice("Post deleted.");
  }

  const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-3">
      {notice && (
        <p role="status" className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary-700">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl rounded-xl border border-border bg-foreground/10 px-4 py-2.5 text-sm text-foreground/55">
          Write, edit and publish journal posts. Hidden posts stay saved but don&apos;t appear on
          the blog — perfect for drafts.
        </p>
        <button type="button" className="btn btn-accent" onClick={startNew}>
          <PackagePlus className="h-4 w-4" aria-hidden="true" /> New post
        </button>
      </div>

      {editing && (
        <PostForm
          key={editing.slug || "new-post"}
          initial={editing}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/55">
          No posts yet — publish your first journal entry.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-2">
          {sorted.map((p) => (
            <li key={p.slug} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
              <img src={p.image} alt="" className="h-12 w-16 shrink-0 rounded-lg bg-foreground/10 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-bold">
                  {p.title}
                  {!p.published && <span className="ml-2 text-foreground/40">(hidden)</span>}
                </p>
                <p className="mt-0.5 truncate text-xs text-foreground/55">
                  /blog/{p.slug} · {p.category} · {p.author} ·{" "}
                  {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(p.date))}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={p.published}
                    onChange={(e) => updatePost(p.slug, { published: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  {p.published ? "Published" : "Draft"}
                </label>
                <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => startEdit(p)} aria-label={`Edit ${p.title}`}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
                {confirming === p.slug ? (
                  <>
                    <button type="button" className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => remove(p.slug)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                    </button>
                    <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setConfirming(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !px-2.5 !py-1.5 text-xs text-destructive"
                    onClick={() => setConfirming(p.slug)}
                    aria-label={`Delete ${p.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostForm({ initial, onSave, onCancel }: { initial: PostFormState; onSave: (f: PostFormState) => void; onCancel: () => void }) {
  const [form, setForm] = useState<PostFormState>(initial);
  const set = <K extends keyof PostFormState>(key: K, value: PostFormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const isEdit = Boolean(form.slug && initial.slug);

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold">{initial.slug ? `Edit: ${initial.title || "untitled post"}` : "New journal post"}</h3>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-2 text-foreground/55" aria-label="Close post form">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="jp-title" className="field-label">Title *</label>
          <input id="jp-title" className="input" required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Choosing your first cue" />
        </div>
        <div>
          <label htmlFor="jp-slug" className="field-label">URL slug</label>
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-xs font-semibold text-foreground/45">/blog/</span>
            <input id="jp-slug" className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="first-cue-guide" disabled={isEdit} />
          </div>
          <p className="mt-1 text-xs text-foreground/50">Leave blank to auto-generate from the title.</p>
        </div>
        <div>
          <label htmlFor="jp-category" className="field-label">Category</label>
          <input id="jp-category" className="input" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Guides" />
        </div>
        <div>
          <label htmlFor="jp-author" className="field-label">Author</label>
          <input id="jp-author" className="input" value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="ISAK Billiard Co." />
        </div>
        <div>
          <label htmlFor="jp-date" className="field-label">Date</label>
          <input id="jp-date" type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <label htmlFor="jp-image" className="field-label">Cover image</label>
          <div className="flex items-center gap-2">
            <img src={form.image} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-foreground/10 object-cover" />
            <select id="jp-image" className="input !py-2" value={form.image} onChange={(e) => set("image", e.target.value)}>
              {IMAGE_OPTIONS.map((src) => (
                <option key={src} value={src}>{src.split("/").pop()}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="jp-minutes" className="field-label">Read time (minutes, optional)</label>
          <input id="jp-minutes" type="number" min="1" className="input" value={form.readMinutes} onChange={(e) => set("readMinutes", e.target.value)} placeholder="auto" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="jp-excerpt" className="field-label">Excerpt</label>
          <textarea id="jp-excerpt" rows={2} className="input resize-none" value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="One or two lines shown on the blog grid" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="jp-video" className="field-label">Video URL (optional)</label>
          <input id="jp-video" type="url" className="input" value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=…" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="jp-content" className="field-label">Content *</label>
          <textarea id="jp-content" rows={8} className="input" value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Write the post here…" />
          <p className="mt-1 text-xs text-foreground/50">A blank line starts a new paragraph.</p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-foreground/80">
        <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} className="h-4 w-4 accent-primary" />
        Published on the blog
      </label>

      <div className="flex gap-3 border-t border-border pt-4">
        <button type="submit" className="btn btn-primary">
          <Check className="h-4 w-4" aria-hidden="true" /> Save post
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}