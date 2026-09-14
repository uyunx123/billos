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
import { useStore, type Order, type OrderStatus, type PaymentStatus } from "./StoreContext";
import { supabase } from "../lib/supabase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ReceiptLine {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface ReceiptData {
  orderId: string;
  number: string;
  issuedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment: string;
  carrier: string;
  couponCode?: string;
  discount: number;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  items: ReceiptLine[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface ReceiptRow {
  id: string;
  orderId: string;
  number: string;
  data: ReceiptData;
  createdAt: string;
}

/** Layout + storefront details rendered on the printable receipt. */
export interface ReceiptSettingsConfig {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  /** Coupon/legal note shown under the totals, e.g. VAT-free pricing. */
  footerNote: string;
  /** Prefix for receipt numbers, e.g. "INV". */
  receiptPrefix: string;
  /** Show the order status badge on the receipt. */
  showStatus: boolean;
}

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettingsConfig = {
  storeName: "ISAK Billiard Co.",
  tagline: "Billiard equipment, cue-by-cue.",
  address: "Jl. Jend. Sudirman Kav. 12, Jakarta 10220",
  phone: "+62 21 555 0123",
  whatsapp: "+62 812 3456 7890",
  email: "hallo@isakbilliard.co.id",
  footerNote: "Terima kasih atas pembelian Anda — every order ships with tips shielded and shafts wrapped.",
  receiptPrefix: "INV",
  showStatus: true,
};

interface ReceiptContextValue {
  receipts: ReceiptRow[];
  /** The receipt snapshot for an order, if one exists yet. */
  receiptForOrder: (orderId: string) => ReceiptRow | undefined;
  /** Settings rendered on the receipt + edited from the admin console. */
  settings: ReceiptSettingsConfig;
  updateSettings: (patch: Partial<ReceiptSettingsConfig>) => void;
  resetSettings: () => void;
}

const ReceiptContext = createContext<ReceiptContextValue | null>(null);

const SETTINGS_KEY = "isak-receipt-settings-v1";
const RECEIPTS_KEY = "isak-receipts-v1";
const SETTINGS_ROW_ID = "1";

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
    /* demo only */
  }
}

function normalizeSettings(stored: Partial<ReceiptSettingsConfig> | null): ReceiptSettingsConfig {
  const b = DEFAULT_RECEIPT_SETTINGS;
  if (!stored || typeof stored !== "object") return b;
  return {
    storeName: stored.storeName?.trim() || b.storeName,
    tagline: stored.tagline?.trim() ?? b.tagline,
    address: stored.address?.trim() ?? b.address,
    phone: stored.phone?.trim() ?? b.phone,
    whatsapp: stored.whatsapp?.trim() ?? b.whatsapp,
    email: stored.email?.trim() ?? b.email,
    footerNote: stored.footerNote?.trim() ?? b.footerNote,
    receiptPrefix: stored.receiptPrefix?.trim() || b.receiptPrefix,
    showStatus: stored.showStatus ?? b.showStatus,
  };
}

/** Build the printable snapshot for an order. */
export function buildReceiptData(order: Order, prefix: string, seq: number, all: ReceiptRow[]): ReceiptData {
  const year = new Date(order.createdAt).getFullYear();
  const used = new Set(
    all
      .map((r) => r.number)
      .filter((n) => n.startsWith(`${prefix}-${year}-`))
  );
  let seqNo = seq;
  while (used.has(`${prefix}-${year}-${String(seqNo).padStart(4, "0")}`)) seqNo += 1;
  return {
    orderId: order.id,
    number: `${prefix}-${year}-${String(seqNo).padStart(4, "0")}`,
    issuedAt: new Date().toISOString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    payment: order.payment ?? "",
    carrier: order.carrier ?? "",
    couponCode: order.couponCode,
    discount: order.discount ?? 0,
    customer: {
      name: order.customer,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      province: order.province,
      postalCode: order.postalCode,
    },
    items: order.items.map((it) => ({
      name: it.name,
      qty: it.qty,
      price: it.price,
      total: it.price * it.qty,
    })),
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
  };
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const { orders } = useStore();
  const [receipts, setReceipts] = useState<ReceiptRow[]>(() =>
    readJson<ReceiptRow[]>(RECEIPTS_KEY, [])
  );
  const [settings, setSettings] = useState<ReceiptSettingsConfig>(() =>
    normalizeSettings(readJson<Partial<ReceiptSettingsConfig> | null>(SETTINGS_KEY, null))
  );
  const hydratedRef = useRef(false);

  useEffect(() => writeJson(RECEIPTS_KEY, receipts), [receipts]);
  useEffect(() => writeJson(SETTINGS_KEY, settings), [settings]);

  /* ---------------- Supabase sync ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) {
        hydratedRef.current = true;
        return;
      }
      const [receiptsRes, settingsRes] = await Promise.all([
        supabase.from("receipts").select("*").limit(500),
        supabase.from("receipt_settings").select("config").eq("id", SETTINGS_ROW_ID).maybeSingle(),
      ]);
      if (!alive) return;
      hydratedRef.current = true;
      if (!receiptsRes.error && receiptsRes.data && receiptsRes.data.length > 0) {
        setReceipts((prev) => {
          const byOrder = new Map(prev.map((r) => [r.orderId, r]));
          for (const row of receiptsRes.data as Record<string, unknown>[]) {
            const data = row.data as ReceiptData | null;
            if (!data || !data.orderId) continue;
            byOrder.set(data.orderId, {
              id: String(row.id),
              orderId: data.orderId,
              number: String(row.number),
              data,
              createdAt: String(row.created_at ?? data.issuedAt ?? new Date().toISOString()),
            });
          }
          return Array.from(byOrder.values());
        });
      }
      if (!settingsRes.error && settingsRes.data?.config && typeof settingsRes.data.config === "object") {
        setSettings(normalizeSettings(settingsRes.data.config as Partial<ReceiptSettingsConfig>));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Write-through receipt settings.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const db = supabase;
    if (!db) return;
    const t = window.setTimeout(() => {
      void db
        .from("receipt_settings")
        .upsert({ id: SETTINGS_ROW_ID, config: settings }, { onConflict: "id" })
        .then(
          () => undefined,
          () => undefined
        );
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, hydratedRef.current]);

  // Push receipts to the DB (idempotent on order_id).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const db = supabase;
    if (!db || receipts.length === 0) return;
    void db
      .from("receipts")
      .upsert(
        receipts.map((r) => ({
          order_id: r.orderId,
          number: r.number,
          data: r.data,
          created_at: r.createdAt,
        })),
        { onConflict: "order_id" }
      )
      .then(
        () => undefined,
        () => undefined
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts, hydratedRef.current]);

  /* ---------------- Auto-create receipts for new orders ---------------- */
  useEffect(() => {
    if (orders.length === 0) return;
    setReceipts((prev) => {
      const existing = new Set(prev.map((r) => r.orderId));
      const missing = orders.filter((o) => !existing.has(o.id));
      if (missing.length === 0) return prev;
      const next = [...prev];
      for (const o of missing) {
        const data = buildReceiptData(o, settings.receiptPrefix, next.length + 1, next);
        next.push({
          id: `receipt-${o.id}`,
          orderId: o.id,
          number: data.number,
          data,
          createdAt: data.issuedAt,
        });
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const receiptForOrder = useCallback(
    (orderId: string) => receipts.find((r) => r.orderId === orderId),
    [receipts]
  );

  const updateSettings = useCallback((patch: Partial<ReceiptSettingsConfig>) => {
    setSettings((prev) => normalizeSettings({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => setSettings(DEFAULT_RECEIPT_SETTINGS), []);

  const value = useMemo<ReceiptContextValue>(
    () => ({ receipts, receiptForOrder, settings, updateSettings, resetSettings }),
    [receipts, receiptForOrder, settings, updateSettings, resetSettings]
  );

  return <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>;
}

export function useReceipts(): ReceiptContextValue {
  const ctx = useContext(ReceiptContext);
  if (!ctx) throw new Error("useReceipts must be used within ReceiptProvider");
  return ctx;
}