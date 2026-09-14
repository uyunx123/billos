# ISAK Billiard Co. — Billiards Online Shop

[![GitHub](https://img.shields.io/badge/GitHub-repo-181717?logo=github&logoColor=white)](https://github.com/alishka170524-star/billshop)
[![React 18](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=fff)](https://react.dev)
[![Vite 7](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com)

An Indonesian e-commerce store for billiards players — tournament cue sticks, tables, balls, chalk, gloves, cue cases and apparel — with IDR pricing, Midtrans payments and a full owner admin panel.

Built with **Vite + React + TypeScript + Tailwind CSS v4**, backed by **Supabase** (Auth + Edge Functions) as a secure serverless payment proxy, and designed mobile-first for shoppers in Indonesia (Shopee & Tokopedia official-store integration).

---

## ✨ Features

| Area | What it does |
| --- | --- |
| 🛍️ **Storefront** | Home page with hero + featured products, sponsorship strip and latest blog posts; category filters (Cues, Tables, Balls, Accessories, Gloves, Apparel); live keyword search and price sorting |
| 🛒 **Cart & checkout** | Quantity steppers, free-shipping progress bar, cached via `localStorage`; full checkout with province → city cascading selectors, shipping couriers, and payment method selection |
| 💳 **Payments** | Midtrans Snap popup (QRIS, bank transfer VA, e-wallets GoPay / OVO / ShopeePay, credit card) through a server-side Edge Function — the server key never reaches the browser. A built-in **demo gateway** keeps the flow testable with zero configuration |
| 👤 **Accounts** | Supabase Auth (social + email), with an owner/admin role gated `/admin` area |
| 🧾 **Orders** | Order history page with a shipment-status timeline (ISAK-XXXXX order IDs) |
| 📝 **Content** | Blog with articles, contact page with Google Maps embed + WhatsApp, sponsorship slots on the homepage |
| 🛠️ **Admin console** | Overview stats, product/order/blog/sponsorship management, payment gateway settings and shipping settings |

## 🧰 Tech Stack

| Layer | Choice |
| --- | --- |
| UI | React 18 + TypeScript |
| Build | Vite 7 (`@vitejs/plugin-react`, `vite-plugin-svgr`) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`, theme tokens in `src/index.css`) |
| Routing | React Router 7 |
| Backend / auth | Supabase (`@supabase/supabase-js`), Edge Functions |
| Payments | Midtrans Snap — proxied by the `create-payment` Edge Function |
| Maps / geocoding | Leaflet (`react-leaflet`) address picker; Google Maps embed on contact |
| Icons | `lucide-react`, `react-icons` (brands) |

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (http://localhost:5173)
npm run dev

# 3. Production build
npm run build && npm run preview

# Type-check (no watch, exits with error code if issues)
npx tsc --noEmit
```

> Requires Node 18+.

### ☁️ Deploy to Cloudflare Pages

The repo is Cloudflare-ready out of the box — no build config changes needed:

1. **Push to GitHub/GitLab**, then in the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Choose the repo, then use these settings:
   - **Framework preset:** Vite (auto-detected)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Under **Settings → Environment variables**, add the two public keys (same names as in the table above):
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Deploy. `public/_redirects` and `public/_headers` are copied into `dist` automatically and give you:
   - **SPA routing** — every path (including deep links like `/product/predator-avant-garde-ebony-le`) rewrites to `index.html` with a 200, so React Router works on refresh.
   - **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.

> Before going live, update the domain in `public/sitemap.xml`, `public/robots.txt` and the Open Graph / canonical URLs in `index.html` to your real Cloudflare domain (they currently point at the preview URL). Origins for Supabase Auth redirects also need to include the new domain.

### Environment variables

The app reads two **public** (publishable) Supabase values — add them to your environment/`.env` (or the platform's Environment store) before the payment proxy is enabled:

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon / publishable** key — safe for the browser |

If either variable is missing, the store still runs fully (catalog + checkout + demo gateway) — only the live payment proxy is skipped.

## 🔐 Supabase & payments

### Architecture

```
Browser ──► Edge Function (create-payment) ──► Midtrans Snap API
                │
                └── reads MIDTRANS_SERVER_KEY via Deno.env.get()
                    (secret never ships to the browser)
```

- The **Midtrans Server Key** lives in **Supabase Edge Functions secrets** (`MIDTRANS_SERVER_KEY`), read only inside the Edge Function. Set `MIDTRANS_IS_PRODUCTION=true` for live mode; otherwise it hits the Midtrans sandbox.
- When no server key is configured, the function returns `mode: "demo"` and the client falls back to the store's built-in demo gateway — the full pay/cancel flow works offline for development and demos.
- **Checkout channels** map to Midtrans Snap connections: `qris` → QRIS, `va` → bank transfer, `ewallet` → GoPay/OVO/ShopeePay, `card` → credit card. Omitting the choice lets Snap show its full set.

### Deploy the Edge Function

```bash
# from repo root, with the Supabase CLI and a linked project:
supabase functions deploy create-payment --no-verify-jwt
supabase secrets set MIDTRANS_SERVER_KEY=your-key MIDTRANS_IS_PRODUCTION=false
```

### Seeding the catalog (optional)

Ready-made SQL seeds live under `supabase/` — run them in the SQL Editor or via `supabase db reset`:

- `supabase/seed_products.sql` — 80+ products across 6 categories
- `supabase/canonical_insert.sql` — canonical insert form
- `supabase/catalog.json` — full catalog payload

> The storefront ships with curated data in `src/data/products.ts`; the SQL seeds set up the same catalog in Postgres when you're ready to move the shop to the database.

## 🗂️ Project structure

```
src/
├── components/   # Header, Footer, ProductCard, AuthModal, ChatWidget, …
├── pages/        # Home, Shop, ProductDetail, Cart, Checkout, CheckoutComplete,
│                 # GatewayDemo, Orders, Blog, BlogPost, Contact, Admin, 404, Custom
├── context/      # Cart, Store, Auth, Config, Review, Chat providers
├── data/         # products, posts, sponsors, marketplaces, regions, seed reviews
├── lib/          # format helpers, supabase client, payments, security utils
└── hooks/        # usePageMeta
supabase/
├── functions/create-payment/   # Edge Function (Midtrans Snap proxy)
├── seed_products.sql           # optional DB seed
└── catalog.json
```

## 🧪 Quality

- TypeScript strict type checking (run `npx tsc --noEmit`)
- Playwright-based smoke audit scripts (dev-dep, run outside the app)
- No console errors in production build; SEO meta, Open Graph and structured data in `index.html`

## 📄 License

Internal source. All rights reserved — product images, brand assets and seed content may not be re-published without ISAK Billiard Co. consent.

---

Built with **native.builder** — an AI software factory.