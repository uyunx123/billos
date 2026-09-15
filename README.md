# ISAK Billiard Co.

[![GitHub](https://img.shields.io/badge/GitHub-repo-181717?logo=github&logoColor=white)](https://github.com/alishka170524-star/billshop)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=fff)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com)

**A complete billiards e-commerce platform for Indonesia** — tournament cue sticks, tables, balls, gloves, cue cases and apparel, sold in IDR with Midtrans payments, plus a full owner/admin console and tournament content hub in one storefront.

Built with **Vite · React 18 · TypeScript · Tailwind CSS v4**, backed by **Supabase** (Auth + Edge Functions) as a secure, serverless payment proxy — designed mobile-first for shoppers across Indonesia, with Shopee &amp; Tokopedia official-store links.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Payments & Supabase Architecture](#payments--supabase-architecture)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Quality](#quality)
- [License](#license)

---

## Features

| Area | What it does |
| --- | --- |
| **Storefront** | Home page with hero, featured products, sponsorship strip and latest blog posts; category filters (Cues, Tables, Balls, Accessories, Gloves, Apparel); live keyword search and price sorting |
| **Cart & checkout** | Quantity steppers, free-shipping progress bar, cart persisted to `localStorage`; checkout with province → city cascading selectors, shipping couriers and payment method selection |
| **Payments** | Midtrans Snap popup (QRIS, bank transfer VA, GoPay / OVO / ShopeePay e-wallets, credit card) through a server-side Edge Function — the server key never reaches the browser. A built-in **demo gateway** keeps the whole flow testable with zero configuration |
| **Accounts** | Supabase Auth (email + social), role-gated owner/admin area |
| **Orders** | Order history with a shipment-status timeline (`ISAK-XXXXX` order IDs) |
| **Content** | Blog with articles, contact page (Google Maps embed + WhatsApp), sponsorship slots on the homepage, FAQ, live scores &amp; tournament pages |
| **Admin console** | Overview stats, product / order / blog / sponsorship management, payment gateway settings and shipping configuration |

## Tech Stack

| Layer | Choice |
| --- | --- |
| UI | React 18 + TypeScript (strict) |
| Build | Vite 7 (`@vitejs/plugin-react`, `vite-plugin-svgr`) |
| Styling | Tailwind CSS v4 (design tokens in `src/index.css` via `@theme`) |
| Routing | React Router 7 |
| Backend / Auth | Supabase (`@supabase/supabase-js`), Edge Functions |
| Payments | Midtrans Snap — proxied by the `create-payment` Edge Function |
| Maps | Leaflet (`react-leaflet`) address picker; Google Maps embed on the contact page |
| Icons | `lucide-react` + `react-icons` (brand/social) |
| Testing | TypeScript `tsc --noEmit`, Playwright smoke-audit scripts |

## Getting Started

Prerequisites: **Node.js 18+** and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server → http://localhost:5173
npm run dev

# 3. Production build + local preview
npm run build
npm run preview

# Type-check (strict, exits non-zero on errors)
npx tsc --noEmit
```

> **No configuration needed to try it.** Without any environment variables the store runs fully — catalog, cart, checkout and the built-in demo payment gateway all work offline. Live payments only turn on once Supabase and the Midtrans server key are configured.

## Environment Variables

The app reads two **public** (publishable) Supabase values. Add them to your environment store or `.env` (both are safe for the browser):

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon / publishable** key — safe for the browser |

If either variable is missing the store still runs fully — only the live payment proxy is skipped.

## Payments & Supabase Architecture

### Flow

```
Browser ──► Edge Function (create-payment) ──► Midtrans Snap API
                │
                └── reads MIDTRANS_SERVER_KEY via Deno.env.get()
                    (secret never ships to the browser)
```

- The **Midtrans Server Key** is stored as a Supabase Edge Function secret (`MIDTRANS_SERVER_KEY`), read only inside the Edge Function. Set `MIDTRANS_IS_PRODUCTION=true` for live mode; otherwise requests hit the Midtrans sandbox.
- When no server key is configured the function returns `mode: "demo"` and the client falls back to the store's built-in demo gateway — the full pay/cancel flow works offline for development and demos.
- **Checkout channels** map to Midtrans Snap connections: `qris` → QRIS, `va` → bank transfer, `ewallet` → GoPay / OVO / ShopeePay, `card` → credit card. Omitting the choice lets Snap show its full set.

### Deploy the Edge Function

```bash
# from the repo root, with the Supabase CLI and a linked project:
supabase functions deploy create-payment --no-verify-jwt
supabase secrets set MIDTRANS_SERVER_KEY=your-key MIDTRANS_IS_PRODUCTION=false
```

### Seeding the catalog (optional)

Ready-made SQL seeds live under `supabase/` — run them in the SQL Editor or via `supabase db reset`:

- `supabase/seed_products.sql` — 80+ products across 6 categories
- `supabase/canonical_insert.sql` — canonical insert form
- `supabase/catalog.json` — full catalog payload

> The storefront ships with curated data in `src/data/products.ts`; the SQL seeds set up the same catalog in Postgres when you move the shop to the database.

## Deployment

### Cloudflare Pages

The repo is Cloudflare-ready out of the box — no build-config changes needed:

1. Push to GitHub/GitLab, then in the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Choose the repo and use the auto-detected settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Under **Settings → Environment variables** add the two public keys from the [table above](#environment-variables).
4. Deploy. `public/_redirects` and `public/_headers` are copied into `dist` automatically and give you:
   - **SPA routing** — every path (including deep links like `/product/predator-avant-garde-ebony-le`) rewrites to `index.html` with a 200, so React Router works on refresh.
   - **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.

> **Before going live:** update the domain references in `public/sitemap.xml`, `public/robots.txt` and the Open Graph / canonical URLs in `index.html` (they currently point at the preview URL), and add the new domain to the Supabase Auth redirect allow-list.

## Project Structure

```
src/
├── components/   # Header, Footer, ProductCard, AuthModal, ChatWidget, …
├── pages/        # Home, Shop, ProductDetail, Cart, Checkout, GatewayDemo,
│                 # Orders, Blog, Contact, Tournament, Admin, 404, …
├── context/      # Cart, Store, Auth, Config, Review, Chat providers
├── data/         # products, posts, sponsors, marketplaces, regions, seed reviews
├── lib/          # format helpers, supabase client, payments, security utils
└── hooks/        # usePageMeta
supabase/
├── functions/create-payment/   # Edge Function (Midtrans Snap proxy)
├── seed_products.sql           # optional DB seed
└── catalog.json
```

## Quality

- TypeScript strict type checking (`npx tsc --noEmit`)
- Playwright-based smoke audit scripts (dev-dependency, run outside the app)
- SEO meta tags, Open Graph, canonical URLs and JSON-LD structured data in `index.html`
- Mobile-first responsive layout (designed at 375 / 768 / 1024 / 1440 px)

## License

Internal source. All rights reserved — product images, brand assets and seed content may not be re-published without ISAK Billiard Co. consent.

---

Built with **native.builder** — an AI software factory.