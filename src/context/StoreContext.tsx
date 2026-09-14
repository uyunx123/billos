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
import { PRODUCTS, type Product } from "../data/products";
import { supabase } from "../lib/supabase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ShippingMethod {
  id: string;
  name: string;
  eta: string;
  baseRate: number; // Rp
  perKg: number; // Rp per kg
  active: boolean;
}

export type OrderStatus =
  | "Pending"
  | "Paid"
  | "Prepared"
  | "Shipped"
  | "Picked"
  | "In transit"
  | "Delivered"
  | "Cancelled";

export type PaymentStatus = "pending" | "submitted" | "accepted" | "declined" | "refunded";

export interface OrderEvent {
  label: string; // e.g. "Order placed", "Payment accepted", "Shipment picked up"
  status: OrderStatus | PaymentStatus;
  at: string; // ISO timestamp
  note?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  events: OrderEvent[];
  email?: string;
  customer: string;
  phone?: string;
  address?: string; // street / detail line
  province?: string;
  city?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  /** Discount applied by a coupon at checkout, in Rupiah (0 = none). */
  discount: number;
  /** Normalized coupon code that produced the discount, when one was used. */
  couponCode?: string;
  total: number;
  carrier: string;
  payment: string;
  /** Gateway id chosen at checkout (qris, va, ewallet, card, …) — used to route the live payment channel. */
  paymentMethodId?: string;
  /** True once the customer confirms they received the parcel (unlocks reviews). */
  received?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  freeShippingThreshold: number;
}

export interface PlaceOrderInput {
  email?: string;
  customer: string;
  phone?: string;
  address?: string;
  province?: string;
  city?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  carrier: string;
  payment: string;
  paymentMethodId?: string;
  shipping: number;
  /** Coupon discount applied at checkout, in Rupiah (0 = none). */
  discount?: number;
  /** Normalized coupon code that produced the discount. */
  couponCode?: string;
  lines: { productId: string; qty: number }[];
}

export type NewProduct = Omit<Product, "id" | "slug"> & { id?: string };

/* ------------------------------------------------------------------ */
/* Order lifecycle                                                     */
/* ------------------------------------------------------------------ */

/** Full happy-path lifecycle shown in the tracking timeline. */
export const ORDER_FLOW: OrderStatus[] = [
  "Pending",
  "Paid",
  "Prepared",
  "Shipped",
  "Picked",
  "In transit",
  "Delivered",
];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Paid", "Cancelled"],
  Paid: ["Prepared", "Cancelled"],
  Prepared: ["Shipped"],
  Shipped: ["Picked", "In transit", "Delivered"],
  Picked: ["In transit", "Delivered"],
  "In transit": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/* ------------------------------------------------------------------ */
/* Defaults + persistence helpers                                      */
/* ------------------------------------------------------------------ */

export const DEFAULT_SHIPPING: ShippingMethod[] = [
  { id: "jne", name: "JNE", eta: "2–4 days", baseRate: 11000, perKg: 8000, active: true },
  { id: "jnt", name: "J&T Express", eta: "2–3 days", baseRate: 10000, perKg: 7500, active: true },
  { id: "sicepat", name: "SiCepat", eta: "1–2 days", baseRate: 12000, perKg: 9000, active: true },
];

export const DEFAULT_SETTINGS: StoreSettings = { freeShippingThreshold: 1_000_000 };

const PRODUCTS_KEY = "isak-store-products-v1";
const SHIPPING_KEY = "isak-store-shipping-v1";
const SETTINGS_KEY = "isak-store-settings-v1";
const ORDERS_KEY = "isak-store-orders-v2";

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

export function shippingRate(m: ShippingMethod, kg: number): number {
  return Math.round(m.baseRate + m.perKg * Math.max(kg, 0));
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Supabase persistence (catalog + order archive)                      */
/* ------------------------------------------------------------------ */

/** Shape of a `public.products` row (snake_case, as stored). */
interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  free_shipping: boolean | null;
  stock: number;
  rating: number;
  reviews: number;
  weight_grams: number;
  image: string;
  blurb: string | null;
  description: string | null;
  featured: boolean | null;
  video_url: string | null;
}

const PRODUCT_COLUMNS =
  "id,slug,name,category,price,compare_at_price,free_shipping,stock,rating,reviews,weight_grams,image,blurb,description,featured,video_url";

function productToRow(p: Product): Record<string, unknown> {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    compare_at_price: p.compareAt ?? null,
    free_shipping: p.freeShipping ?? false,
    stock: p.stock,
    rating: p.rating,
    reviews: p.reviews,
    weight_grams: p.weightGrams,
    image: p.image,
    blurb: p.blurb ?? null,
    description: p.description ?? null,
    featured: p.featured ?? false,
    video_url: p.videoUrl ?? null,
  };
}

function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as Product["category"],
    price: row.price,
    compareAt: row.compare_at_price ?? undefined,
    freeShipping: row.free_shipping ?? undefined,
    stock: row.stock,
    rating: row.rating,
    reviews: row.reviews,
    weightGrams: row.weight_grams,
    image: row.image,
    blurb: row.blurb ?? "",
    description: row.description ?? "",
    featured: row.featured ?? false,
    videoUrl: row.video_url ?? undefined,
  };
}

/** Persisted order row — the full order travels as a `doc` jsonb document. */
function orderToRow(o: Order): Record<string, unknown> {
  return {
    id: o.id,
    doc: o,
    customer: o.customer,
    email: o.email ?? null,
    total: o.total,
    discount: o.discount ?? 0,
    coupon_code: o.couponCode ?? null,
    status: o.status,
    created_at: o.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface StoreContextValue {
  products: Product[];
  shippingMethods: ShippingMethod[];
  settings: StoreSettings;
  orders: Order[];
  addProduct: (p: NewProduct) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  updateStock: (id: string, stock: number) => void;
  deleteProduct: (id: string) => void;
  addShippingMethod: (m: Omit<ShippingMethod, "id">) => void;
  updateShippingMethod: (id: string, patch: Partial<ShippingMethod>) => void;
  deleteShippingMethod: (id: string) => void;
  updateSettings: (patch: Partial<StoreSettings>) => void;
  placeOrder: (input: PlaceOrderInput) => Order;
  /** Advance an order to `status` — records a timestamped event. */
  setOrderStatus: (id: string, status: OrderStatus, note?: string) => void;
  updatePaymentStatus: (id: string, paymentStatus: PaymentStatus) => void;
  /** Issue a refund for an accepted payment: restocks the items and cancels the order. */
  refundOrder: (id: string) => void;
  /** Customer confirms they received the parcel — marks the order reviewable. */
  confirmReceived: (id: string) => void;
  getProductBySlug: (slug: string) => Product | undefined;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => readJson(PRODUCTS_KEY, PRODUCTS));
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(() =>
    readJson(SHIPPING_KEY, DEFAULT_SHIPPING)
  );
  const [settings, setSettings] = useState<StoreSettings>(() =>
    readJson(SETTINGS_KEY, DEFAULT_SETTINGS)
  );
  const [orders, setOrders] = useState<Order[]>(() => readJson(ORDERS_KEY, [] as Order[]));

  useEffect(() => writeJson(PRODUCTS_KEY, products), [products]);
  useEffect(() => writeJson(SHIPPING_KEY, shippingMethods), [shippingMethods]);
  useEffect(() => writeJson(SETTINGS_KEY, settings), [settings]);
  useEffect(() => writeJson(ORDERS_KEY, orders), [orders]);

  /* ---------------- Supabase sync (catalog + order archive) ---------------- */
  // Hydrate from the database once on mount. Local storage stays the instant
  // fallback so the store still works completely offline.
  const hydratedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) {
        hydratedRef.current = true; // no backend — everything stays local
        return;
      }
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from("products").select(PRODUCT_COLUMNS).order("id", { ascending: true }),
        supabase.from("orders").select("doc").limit(300),
      ]);
      if (!alive) return;
      hydratedRef.current = true;

      // Catalog: the DB wins, but keep any local-only products (added while
      // offline) and preserve extra fields the DB row may not carry.
      if (!productsRes.error && productsRes.data && productsRes.data.length > 0) {
        const rows = productsRes.data as ProductRow[];
        setProducts((prev) => {
          const dbIds = new Set(rows.map((r) => r.id));
          const db = rows.map((r) => {
            const local = prev.find((p) => p.id === r.id);
            return productFromRow({
              ...r,
              video_url: r.video_url ?? local?.videoUrl ?? null,
            });
          });
          const localOnly = prev.filter((p) => !dbIds.has(p.id));
          return [...db, ...localOnly];
        });
      }

      // Orders: merge remote archive into local state (remote wins on a
      // collision so status updates survive a refresh on another device).
      if (!ordersRes.error && ordersRes.data && ordersRes.data.length > 0) {
        const remote = (ordersRes.data as { doc?: unknown }[])
          .map((r) => r.doc)
          .filter((d): d is Order => !!d && typeof d === "object");
        if (remote.length > 0) {
          setOrders((prev) => {
            const byId = new Map<string, Order>();
            for (const o of prev) byId.set(o.id, o);
            for (const o of remote) byId.set(o.id, o);
            return Array.from(byId.values()).sort((a, b) =>
              a.createdAt < b.createdAt ? 1 : -1
            );
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Write-through: after hydration settles, push the catalog to the DB so
  // admin edits and stock movements persist. Debounced to avoid churn.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const db = supabase; // local const keeps the null check across closures
    if (!db) return;
    if (products.length === 0) return;
    const t = window.setTimeout(() => {
      void db
        .from("products")
        .upsert(
          products.map((p) => ({ id: p.id, ...productToRow(p) })),
          { onConflict: "id" }
        )
        .then(
          () => undefined,
          () => undefined
        );
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, hydratedRef.current]);

  // Order archive: every order (and status change) is mirrored to the DB.
  useEffect(() => {
    const db = supabase;
    if (!db || orders.length === 0) return;
    void db
      .from("orders")
      .upsert(orders.map(orderToRow), { onConflict: "id" })
      .then(
        () => undefined,
        () => undefined
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, hydratedRef]);

  const addProduct = useCallback((p: NewProduct): Product => {
    const base = slugify(p.name) || "product";
    let slug = base;
    let i = 2;
    const exists = (s: string) =>
      products.some((x) => x.slug === s) || products.some((x) => slugify(x.name) === s);
    while (exists(slug)) {
      slug = `${base}-${i}`;
      i += 1;
    }
    const product: Product = {
      id: p.id ?? `p-${Date.now().toString(36)}`,
      ...p,
      slug,
      rating: p.rating ?? 4.5,
      reviews: p.reviews ?? 0,
    };
    setProducts((prev) => [...prev, product]);
    return product;
  }, [products]);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const updateStock = useCallback((id: string, stock: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, Math.round(stock)) } : p))
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    const db = supabase;
    if (db) {
      void db
        .from("products")
        .delete()
        .eq("id", id)
        .then(
          () => undefined,
          () => undefined
        );
    }
  }, []);

  const addShippingMethod = useCallback((m: Omit<ShippingMethod, "id">) => {
    setShippingMethods((prev) => [
      ...prev,
      { ...m, id: `ship-${Date.now().toString(36)}`, active: m.active ?? true },
    ]);
  }, []);

  const updateShippingMethod = useCallback((id: string, patch: Partial<ShippingMethod>) => {
    setShippingMethods((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const deleteShippingMethod = useCallback((id: string) => {
    setShippingMethods((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateSettings = useCallback((patch: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const placeOrder = useCallback((input: PlaceOrderInput): Order => {
    const items: OrderItem[] = input.lines
      .map((l) => {
        const p = products.find((prod) => prod.id === l.productId);
        if (!p) return null;
        return { productId: p.id, name: p.name, price: p.price, qty: l.qty, image: p.image };
      })
      .filter(Boolean) as OrderItem[];

    const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    const discount = Math.max(0, Math.round(input.discount ?? 0));
    const createdAt = nowIso();
    const id = `ISAK-${String(Date.now()).slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`;
    const order: Order = {
      id,
      status: "Pending",
      paymentStatus: "pending",
      events: [{ label: "Order placed", status: "Pending", at: createdAt }],
      email: input.email,
      customer: input.customer,
      phone: input.phone,
      address: input.address,
      province: input.province,
      city: input.city,
      postalCode: input.postalCode,
      lat: input.lat,
      lng: input.lng,
      items,
      subtotal,
      shipping: input.shipping,
      discount,
      couponCode: input.couponCode?.trim().toUpperCase() || undefined,
      total: Math.max(0, subtotal + input.shipping - discount),
      carrier: input.carrier,
      payment: input.payment,
      paymentMethodId: input.paymentMethodId,
      createdAt,
      updatedAt: createdAt,
    };

    // Decrement stock for every purchased line.
    setProducts((prev) =>
      prev.map((p) => {
        const line = items.find((it) => it.productId === p.id);
        return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
      })
    );
    setOrders((prev) => [order, ...prev]);
    return order;
  }, [products]);

  const setOrderStatus = useCallback((id: string, status: OrderStatus, note?: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id || o.status === status) return o;
        if (!canTransition(o.status, status)) return o;
        const at = nowIso();
        return {
          ...o,
          status,
          updatedAt: at,
          events: [...o.events, { label: labelForStatus(status), status, at, note }],
        };
      })
    );
  }, []);

  const updatePaymentStatus = useCallback((id: string, paymentStatus: PaymentStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id || o.paymentStatus === paymentStatus) return o;
        const at = nowIso();
        const label =
          paymentStatus === "accepted"
            ? "Payment accepted"
            : paymentStatus === "declined"
              ? "Payment declined"
              : paymentStatus === "submitted"
                ? "Payment submitted — awaiting confirmation"
                : "Payment pending";
        const status: OrderStatus =
          paymentStatus === "accepted" ? "Paid" : paymentStatus === "declined" ? "Cancelled" : o.status;
        return {
          ...o,
          paymentStatus,
          status,
          updatedAt: at,
          events: [...o.events, { label, status: paymentStatus, at }],
        };
      })
    );
  }, []);

  const refundOrder = useCallback((id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.paymentStatus !== "accepted") return; // only refund a captured payment
    // Give the stock back first — a plain, pure update (StrictMode-safe).
    setProducts((prods) =>
      prods.map((p) => {
        const line = order.items.find((it) => it.productId === p.id);
        return line ? { ...p, stock: p.stock + line.qty } : p;
      })
    );
    const at = nowIso();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        return {
          ...o,
          paymentStatus: "refunded",
          status: "Cancelled",
          received: undefined,
          updatedAt: at,
          events: [
            ...o.events,
            { label: "Refund initiated", status: "refunded", at, note: "Payment returned to the customer" },
            { label: "Refunded", status: "refunded", at, note: "Order cancelled, stock returned to the shelf" },
          ],
        };
      })
    );
  }, [orders]);

  const confirmReceived = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id || o.status !== "Delivered" || o.received) return o;
        const at = nowIso();
        return {
          ...o,
          received: true,
          updatedAt: at,
          events: [...o.events, { label: "Order confirmed by customer", status: "Delivered", at }],
        };
      })
    );
  }, []);

  const getProductBySlug = useCallback(
    (slug: string) => products.find((p) => p.slug === slug),
    [products]
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      products,
      shippingMethods,
      settings,
      orders,
      addProduct,
      updateProduct,
      updateStock,
      deleteProduct,
      addShippingMethod,
      updateShippingMethod,
      deleteShippingMethod,
      updateSettings,
      placeOrder,
      setOrderStatus,
      updatePaymentStatus,
      refundOrder,
      confirmReceived,
      getProductBySlug,
    }),
    [
      products,
      shippingMethods,
      settings,
      orders,
      addProduct,
      updateProduct,
      updateStock,
      deleteProduct,
      addShippingMethod,
      updateShippingMethod,
      deleteShippingMethod,
      updateSettings,
      placeOrder,
      setOrderStatus,
      updatePaymentStatus,
      refundOrder,
      confirmReceived,
      getProductBySlug,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function labelForStatus(status: OrderStatus | PaymentStatus): string {
  const map: Record<string, string> = {
    Pending: "Order placed",
    Paid: "Payment accepted — order paid",
    Prepared: "Order prepared",
    Shipped: "Shipped to you",
    Picked: "Shipment picked up",
    "In transit": "Delivery in progress",
    Delivered: "Delivered",
    Cancelled: "Cancelled",
    pending: "Payment pending",
    submitted: "Payment submitted",
    accepted: "Payment accepted",
    declined: "Payment declined",
    refunded: "Refunded",
  };
  return map[status] ?? status;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}