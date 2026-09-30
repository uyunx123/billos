import type { FlashSale, Product } from "../data/products";

export type { FlashSale };

/**
 * Flash-sale helpers shared by the storefront (flash sale page, product cards,
 * cart pricing) and the admin console (product manager).
 */

const clampPct = (n: number) => Math.min(95, Math.max(1, Math.round(n)));

/** The discounted price for a product's flash sale (falls back to the base price). */
export function flashPrice(product: Product): number {
  const f = product.flashSale;
  if (!f || !f.enabled) return product.price;
  if (f.salePrice && f.salePrice > 0) {
    return Math.max(100, Math.min(f.salePrice, product.price));
  }
  if (f.discountPercent && f.discountPercent > 0) {
    const pct = clampPct(f.discountPercent);
    if (pct >= 100) return 0;
    return Math.round(product.price * (1 - pct / 100));
  }
  return product.price;
}

/** Whole-number % saving of a live flash sale (0 when there is no saving). */
export function flashDiscountPercent(product: Product): number {
  const price = flashPrice(product);
  if (price >= product.price || product.price <= 0) return 0;
  return Math.round((1 - price / product.price) * 100);
}

export type FlashPhase = "none" | "upcoming" | "live" | "ended";

/** Where a product's flash sale sits relative to `now` (ms epoch). */
export function flashPhase(product: Product, now = Date.now()): FlashPhase {
  const f = product.flashSale;
  if (!f || !f.enabled) return "none";
  const start = f.startsAt ? new Date(f.startsAt).getTime() : null;
  const end = f.endsAt ? new Date(f.endsAt).getTime() : null;
  if (start !== null && Number.isFinite(start) && now < start) return "upcoming";
  if (end !== null && Number.isFinite(end) && now > end) return "ended";
  return "live";
}

/** The price a shopper actually pays for this product right now. */
export function effectivePrice(product: Product, now = Date.now()): number {
  return flashPhase(product, now) === "live" ? flashPrice(product) : product.price;
}

/** Remaining units and how far along the sale's stock is (for the progress bar). */
export function flashStock(product: Product) {
  const f = product.flashSale;
  const limit = Math.max(0, Math.round(f?.stockLimit ?? 0));
  const claimed = Math.min(limit, Math.max(0, Math.round(f?.claimed ?? 0)));
  const remaining = Math.max(0, limit - claimed);
  const pct = limit > 0 ? Math.min(100, Math.round((claimed / limit) * 100)) : 0;
  return { limit, claimed, remaining, pct };
}

export interface Countdown {
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
}

/** Break a countdown target (ms epoch) into labelled parts. */
export function countdownParts(target: number, now = Date.now()): Countdown {
  const diff = Math.max(0, target - now);
  const done = diff <= 0;
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const label =
    days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return { done, days, hours, minutes, seconds, label };
}
