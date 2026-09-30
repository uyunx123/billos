import { useEffect, useMemo, useState } from "react";
import type { Product } from "../data/products";
import { useStore } from "../context/StoreContext";
import { flashPhase, type FlashPhase } from "../lib/flashSale";

export interface SaleGroup {
  live: Product[];
  upcoming: Product[];
  ended: Product[];
}

/**
 * Products grouped by flash-sale phase, with a `now` timestamp that ticks
 * every second so countdowns and "goes live" moments stay current.
 */
export function useFlashSales(): SaleGroup & { now: number } {
  const { products } = useStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  return useMemo(() => {
    const groups: Record<FlashPhase, Product[]> = { none: [], upcoming: [], live: [], ended: [] };
    for (const p of products) {
      if (!p.flashSale) continue;
      groups[flashPhase(p, now)].push(p);
    }
    return {
      live: groups.live,
      upcoming: groups.upcoming,
      ended: groups.ended,
      now,
    };
  }, [products, now]);
}