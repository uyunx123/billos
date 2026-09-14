import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "../data/products";
import { useStore } from "./StoreContext";

interface CartLine {
  productId: string;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  addItem: (product: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "billiards-cart";

function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useStore();
  const [lines, setLines] = useState<CartLine[]>(readStored);

  // Drop lines whose product was deleted from the catalog.
  useEffect(() => {
    setLines((prev) => prev.filter((l) => products.some((p) => p.id === l.productId)));
  }, [products]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const addItem = useCallback(
    (product: Product, qty = 1) => {
      setLines((prev) => {
        // Re-check current stock from the live catalog.
        const live = products.find((p) => p.id === product.id);
        const maxQty = Math.max(live?.stock ?? 0, 0);
        const existing = prev.find((l) => l.productId === product.id);
        if (existing) {
          return prev.map((l) =>
            l.productId === product.id
              ? { ...l, qty: Math.min(l.qty + qty, maxQty || 1) }
              : l
          );
        }
        if (maxQty <= 0) return prev;
        return [...prev, { productId: product.id, qty: Math.min(qty, maxQty) }];
      });
    },
    [products]
  );

  const setQty = useCallback(
    (productId: string, qty: number) => {
      const live = products.find((p) => p.id === productId);
      const maxQty = Math.max(live?.stock ?? 0, 0);
      const clamped = Math.max(0, Math.min(qty, maxQty || 99));
      setLines((prev) =>
        clamped <= 0
          ? prev.filter((l) => l.productId !== productId)
          : prev.map((l) => (l.productId === productId ? { ...l, qty: clamped } : l))
      );
    },
    [products]
  );

  const removeItem = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const { count, subtotal } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const line of lines) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) continue;
      count += line.qty;
      subtotal += product.price * line.qty;
    }
    return { count, subtotal };
  }, [lines, products]);

  const value = useMemo(
    () => ({ lines, count, subtotal, addItem, setQty, removeItem, clear }),
    [lines, count, subtotal, addItem, setQty, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}