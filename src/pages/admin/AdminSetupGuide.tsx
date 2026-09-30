import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CircleDashed,
  Copy,
  Database,
  FileText,
  Fuel,
  Megaphone,
  Newspaper,
  Package,
  Palette,
  PlugZap,
  ReceiptText,
  Rocket,
  Search,
  ShieldCheck,
  Store,
  Ticket,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useConfig } from "../../context/ConfigContext";
import { useTheme } from "../../context/ThemeContext";
import { useStore } from "../../context/StoreContext";
import { useGateways } from "../../context/GatewayContext";
import { useReceipts } from "../../context/ReceiptContext";
import { useCoupons } from "../../context/CouponContext";
import { BRAND_LOGO } from "../../lib/logo";
import { cn } from "../../lib/cn";

type StepStatus = "done" | "todo" | "manual";

interface Step {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  status: StepStatus;
  to?: string;
  cta?: string;
  snippet?: string;
  snippetLabel?: string;
  note?: ReactNode;
}

interface StepGroup {
  title: string;
  blurb: string;
  steps: Step[];
}

const ENV_SNIPPET = `# Public config — safe to ship to the browser.
# Set these in the project's Environment settings (VITE_ prefix required).
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable anon key>`;

const SECRET_SNIPPET = `# Real secrets NEVER go in the frontend or a .env file.
# Store them as Supabase Edge Function secrets (SCREAMING_SNAKE_CASE)
# and read them inside the function with Deno.env.get(...).
MIDTRANS_SERVER_KEY=<server key>
STRIPE_SECRET_KEY=<secret key>
BITESHIP_API_KEY=<api key>`;

const REDIRECTS_SNIPPET = `# public/_redirects — single-page-app fallback
/*    /index.html   200`;

const HEADERS_SNIPPET = `# public/_headers — baseline security headers
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self)`;

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-foreground/70 transition-colors duration-150 hover:border-primary/40 hover:text-primary"
    >
      {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function StatusPill({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary-400">
        <Check className="h-3 w-3" aria-hidden="true" /> Configured
      </span>
    );
  }
  if (status === "manual") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-bold text-foreground/55">
        <CircleDashed className="h-3 w-3" aria-hidden="true" /> Reference
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-500/15 px-2.5 py-1 text-[11px] font-bold text-gold-300">
      <CircleDashed className="h-3 w-3" aria-hidden="true" /> Needs attention
    </span>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  const isDone = step.status === "done";
  return (
    <li className={cn("rounded-2xl border p-4", isDone ? "border-primary/25 bg-primary/5" : "border-border bg-surface-2")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl font-heading text-sm font-extrabold",
            isDone ? "bg-primary/15 text-primary-400" : "bg-foreground/10 text-foreground/50"
          )}
          aria-hidden="true"
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/40">Step {index}</span>
            <StatusPill status={step.status} />
          </div>
          <h3 className="mt-1 font-heading text-base font-bold">{step.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground/65">{step.desc}</p>
          {step.note && <p className="mt-1.5 text-xs text-foreground/50">{step.note}</p>}

          {step.snippet && (
            <div className="mt-3 overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-foreground/10 px-3 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/45">
                  {step.snippetLabel ?? "Snippet"}
                </span>
                <CopyButton value={step.snippet} />
              </div>
              <pre className="overflow-x-auto bg-primary-950/40 px-3 py-2.5 text-[11px] leading-relaxed text-foreground/75">
                <code>{step.snippet}</code>
              </pre>
            </div>
          )}

          {step.to && (
            <Link
              to={step.to}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground/75 transition-colors duration-150 hover:border-primary/40 hover:text-primary"
            >
              {step.cta ?? "Open"} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Full configuration guide for the store owner — a single page listing every
 * setup step with live status derived from the actual store configuration.
 */
export default function AdminSetupGuide() {
  const { siteConfig, logo, pages, posts, sponsors } = useConfig();
  const { theme } = useTheme();
  const { products, orders, shippingMethods, settings } = useStore();
  const { gateways } = useGateways();
  const { settings: receiptSettings } = useReceipts();
  const { coupons } = useCoupons();

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

  const groups: StepGroup[] = [
    {
      title: "1 · Get the basics in place",
      blurb: "The essentials a shopper expects to find before they trust you with an order.",
      steps: [
        {
          id: "profile",
          icon: Store,
          title: "Store profile & contact details",
          desc: "Phone, WhatsApp, email, address and opening hours — these fill the footer and contact page. Add your social profiles and official store links (Shopee, Tokopedia…) here too.",
          status: siteConfig.phone && siteConfig.email && siteConfig.address ? "done" : "todo",
          to: "/admin#config",
          cta: "Open Configuration → Site settings",
        },
        {
          id: "brand",
          icon: Palette,
          title: "Brand look — palette, width & radius",
          desc: "Pick one of the ready-made colour palettes or switch to Custom and set your own four brand colours. Page width and corner radius fine-tune the layout.",
          status: theme.palette !== "cobalt" || !!theme.custom ? "done" : "todo",
          to: "/admin#config",
          cta: "Open Configuration → Theme & layout",
        },
        {
          id: "logo",
          icon: FileText,
          title: "Logo & branding",
          desc: "Upload a square PNG or JPG for the header, footer and sign-in dialog. The image is resized in the browser before it is saved.",
          status: logo !== BRAND_LOGO ? "done" : "todo",
          to: "/admin#config",
          cta: "Open Configuration → Logo & branding",
        },
        {
          id: "receipt",
          icon: ReceiptText,
          title: "Receipt & store name",
          desc: "The store name, address, phone, receipt-number prefix and footer note printed on every order receipt at /receipt/<order>.",
          status:
            receiptSettings.storeName && receiptSettings.storeName !== "ISAK Billiard Co." ? "done" : "todo",
          to: "/admin#config",
          cta: "Open Configuration → Receipt & layout",
        },
      ],
    },
    {
      title: "2 · Start selling",
      blurb: "Catalogue, payments and delivery — the machinery behind checkout.",
      steps: [
        {
          id: "products",
          icon: Package,
          title: "Build the catalogue",
          desc: "Add products with prices, stock, weights, images and optional videos. From the same tab you can put items on a timed flash sale that appears on the /flash-sale page.",
          status: products.length > 0 ? "done" : "todo",
          note: `${products.length} product${products.length === 1 ? "" : "s"} in the catalogue.`,
          to: "/admin#products",
          cta: "Open Products",
        },
        {
          id: "payments",
          icon: Wallet,
          title: "Connect payment methods",
          desc: "Wire up a gateway (Midtrans, Xendit, Stripe) or set up manual methods like bank transfer, QRIS or cash on delivery. Gateway credentials are stored server-side and never reach the browser.",
          status: gateways.some((g) => g.enabled && g.status === "connected") ? "done" : "todo",
          to: "/admin#config",
          cta: "Open Configuration → Payment gateways",
        },
        {
          id: "shipping",
          icon: Truck,
          title: "Shipping, couriers & free-shipping threshold",
          desc: "Set courier names, delivery estimates, base and per-kg rates, and the order total above which shipping is free.",
          status: shippingMethods.some((m) => m.active) ? "done" : "todo",
          note: `Free shipping above ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(settings.freeShippingThreshold)}.`,
          to: "/admin#shipping",
          cta: "Open Shipping",
        },
        {
          id: "coupons",
          icon: Ticket,
          title: "Discount coupons",
          desc: "Percentage or fixed-Rupiah codes with minimum spend, caps, validity windows and per-customer usage limits.",
          status: coupons.length > 0 ? "done" : "todo",
          note: `${coupons.length} coupon${coupons.length === 1 ? "" : "s"} created.`,
          to: "/admin#config",
          cta: "Open Configuration → Coupons",
        },
      ],
    },
    {
      title: "3 · Look after your customers",
      blurb: "Content, communication and the day-to-day back office.",
      steps: [
        {
          id: "content",
          icon: Newspaper,
          title: "Homepage, pages, journal & partners",
          desc: "Edit the hero headline and photo carousel, publish extra pages at /page/<slug>, post journal entries at /blog, and slot partner banners into the shop grid.",
          status: pages.length + posts.length + sponsors.length > 0 ? "done" : "todo",
          to: "/admin#config",
          cta: "Open Configuration",
        },
        {
          id: "orders",
          icon: ReceiptText,
          title: "Order workflow, tracking & reviews",
          desc: "Confirm payments, move each order through prepare → ship → transit → delivered, attach courier tracking numbers, issue refunds and moderate reviews. Reply to chat from the Chat tab.",
          status: orders.length > 0 ? "done" : "todo",
          note: `${orders.length} order${orders.length === 1 ? "" : "s"} so far.`,
          to: "/admin#orders",
          cta: "Open Orders",
        },
        {
          id: "newsticker",
          icon: Megaphone,
          title: "Newsticker & announcements",
          desc: "The scrolling ticker along the bottom of the storefront, plus the announcement bar text that can interpolate the free-shipping threshold with {threshold}.",
          status: "manual",
          to: "/admin/newsticker",
          cta: "Open Newsticker",
        },
      ],
    },
    {
      title: "4 · Integrations & credentials",
      blurb: "Where each key lives, and why it matters.",
      steps: [
        {
          id: "integrations",
          icon: PlugZap,
          title: "Provider keys & live couriers",
          desc: "Extra provider keys — such as the Biteship key that powers real shipment creation and live JNE / J&T / SiCepat tracking — are managed on the Integrations page. Until a key is added you can still attach a tracking number manually.",
          status: "manual",
          to: "/admin/integrations",
          cta: "Open Integrations",
          snippet: SECRET_SNIPPET,
          snippetLabel: "Secrets — server-side only",
        },
        {
          id: "partnerships",
          icon: Megaphone,
          title: "Partnerships & marketplace syndication",
          desc: "Manage partner placements and official marketplace listings (Shopee, Tokopedia and friends) so the same catalogue is discoverable off-site.",
          status: "manual",
          to: "/admin/partnerships",
          cta: "Open Partnerships",
        },
      ],
    },
    {
      title: "5 · Publish, secure & go live",
      blurb: "The infrastructure behind the shop — check these once and you're done.",
      steps: [
        {
          id: "database",
          icon: Database,
          title: "Database connection",
          desc: "The store syncs the catalogue, orders, reviews, chat and accounts to Supabase, with local storage as an offline fallback so nothing is lost if the connection drops.",
          status: supabaseUrl ? "done" : "todo",
          note: supabaseUrl ? "Supabase is connected for this environment." : "No Supabase URL configured for this environment.",
          snippet: ENV_SNIPPET,
          snippetLabel: "Public environment variables",
        },
        {
          id: "seo",
          icon: Search,
          title: "SEO & sharing metadata",
          desc: "The document head holds the site title, description, canonical URL, Open Graph and Twitter Card tags. Each route also sets its own metadata, and product pages emit JSON-LD structured data.",
          status: "manual",
          note: "Run the SEO agent to refresh title/description/Open Graph in index.html.",
        },
        {
          id: "deploy",
          icon: Rocket,
          title: "Hosting, redirects & security headers",
          desc: "The single-page app needs every unknown path rewritten to index.html, plus a small set of baseline security headers.",
          status: "manual",
          snippet: REDIRECTS_SNIPPET,
          snippetLabel: "public/_redirects",
        },
        {
          id: "headers",
          icon: ShieldCheck,
          title: "Security headers",
          desc: "Keep your security.txt policy current at /.well-known/security.txt and ship the baseline headers below.",
          status: "manual",
          snippet: HEADERS_SNIPPET,
          snippetLabel: "public/_headers",
        },
      ],
    },
  ];

  const allSteps = groups.flatMap((g) => g.steps);
  const actionable = allSteps.filter((s) => s.status !== "manual");
  const complete = actionable.filter((s) => s.status === "done").length;
  const pct = actionable.length > 0 ? Math.round((complete / actionable.length) * 100) : 0;
  let stepNo = 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-8 shadow-soft sm:px-8">
        <span className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
        <p className="eyebrow flex items-center gap-1.5">
          <Fuel className="h-3.5 w-3.5" aria-hidden="true" /> Setup guide
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Configuration setup guide</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">
          Every step to take a store from blank to selling — in order, with the live status of each one.
          Anything marked <strong className="text-gold-300">Needs attention</strong> is safe to do next; the rest is
          already wired up or is reference material to keep for later.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="min-w-56 flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-foreground/60">
              <span>Setup progress</span>
              <span>{complete} of {actionable.length} steps</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={actionable.length}
              aria-valuenow={complete}
              aria-label={`Setup progress: ${complete} of ${actionable.length} steps complete`}
              className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-600 via-gold-500 to-gold-300 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Link to="/admin#overview" className="btn btn-outline !px-4 !py-2.5 text-sm">
            Back to the console
          </Link>
        </div>
      </div>

      {pct === 100 && (
        <p className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary-400">
          <Check className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
          Every essential step is configured — the shop is ready to take orders.
        </p>
      )}

      {/* Groups */}
      {groups.map((group) => (
        <section key={group.title} aria-labelledby={`setup-${group.steps[0]?.id ?? group.title}`}>
          <div className="mb-3">
            <h2 className="font-heading text-xl font-bold" id={`setup-${group.steps[0]?.id ?? group.title}`}>
              {group.title}
            </h2>
            <p className="text-sm text-foreground/55">{group.blurb}</p>
          </div>
          <ul className="grid gap-3 lg:grid-cols-2">
            {group.steps.map((step) => {
              stepNo += 1;
              return <StepCard key={step.id} step={step} index={stepNo} />;
            })}
          </ul>
        </section>
      ))}

      <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs leading-relaxed text-foreground/50">
        Tip: open the full configuration checklist any time from <strong className="text-foreground/70">Admin → Configuration</strong>.
        Every change you make there goes live in the shop immediately and syncs to Supabase, so all your devices stay in step.
      </p>
    </div>
  );
}