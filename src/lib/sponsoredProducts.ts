import type { Product } from "../data/products";

/**
 * Active partner/sponsor ids → brand keywords that appear in the catalog's
 * product names. Used to surface "Sponsored" product suggestions on the shop
 * search results. Keep in sync with the partner line-up in the admin console.
 */
const SPONSOR_BRAND_TERMS: Record<string, string[]> = {
  predator: ["predator"],
  aramith: ["aramith"],
  murrey: ["murrey"],
};

/**
 * Returns the subset of products that belong to the given active
 * partner/sponsor brands (matched case-insensitively on the product name).
 */
export function getSponsoredProducts(products: Product[], sponsorIds: string[]): Product[] {
  const terms = sponsorIds.flatMap((id) => SPONSOR_BRAND_TERMS[id] ?? []).map((t) => t.toLowerCase());
  if (terms.length === 0) return [];
  return products.filter((p) => terms.some((t) => p.name.toLowerCase().includes(t)));
}