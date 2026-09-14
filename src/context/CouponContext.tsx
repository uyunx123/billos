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
import { supabase } from "../lib/supabase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CouponType = "percent" | "fixed";

export interface Coupon {
  id: string;
  /** Normalized upper-case code — what the customer types at checkout. */
  code: string;
  /** Short label shown in the admin console (e.g. "Welcome 10%"). */
  title: string;
  type: CouponType;
  /** percent (0–100) or fixed discount in Rupiah. */
  value: number;
  /** Smallest order subtotal the coupon applies to, in Rupiah. */
  minimumSpend: number;
  /** Cap for percent coupons, in Rupiah. */
  maximumDiscount?: number;
  /** ISO date (optional) — not usable before this. */
  validFrom?: string;
  /** ISO date (optional) — not usable after this. */
  validUntil?: string;
  /** Total number of orders that may use this coupon (optional). */
  usageLimit?: number;
  /** Times one email address may use it (default 1). */
  perUserLimit: number;
  /** How many times it has been claimed so far (ledger-driven). */
  usedCount: number;
  active: boolean;
  createdAt: string;
}

export type NewCoupon = Omit<Coupon, "id" | "usedCount" | "createdAt"> & { id?: string };

/** Result of evaluating a code against a cart + email. */
export interface CouponEvaluation {
  ok: boolean;
  error?: string;
  coupon?: Coupon;
  /** Discount in Rupiah that should be applied. */
  discount: number;
}

interface CouponClaim {
  couponId: string;
  email: string;
  orderId: string;
  claimedAt: string;
}

interface CouponContextValue {
  coupons: Coupon[];
  addCoupon: (c: NewCoupon) => Coupon | null;
  updateCoupon: (id: string, patch: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  /** Validate a typed code against the basket. Never records usage. */
  evaluate: (code: string, subtotal: number, email?: string) => CouponEvaluation;
  /** Record a claim (usedCount+ledger). Idempotent per (coupon, order). */
  claim: (code: string, email: string, orderId: string) => void;
  /** Reverse a claim when an order is refunded/cancelled. Safe to call twice. */
  releaseForOrder: (orderId: string) => void;
}

const CouponContext = createContext<CouponContextValue | null>(null);

/* ------------------------------------------------------------------ */
/* Defaults + persistence                                              */
/* ------------------------------------------------------------------ */

const COUPONS_KEY = "isak-coupons-v1";
const CLAIMS_KEY = "isak-coupon-claims-v1";

/** Demo seed so coupons are usable out of the box. The owner edits these in admin. */
export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "coupon-welcome10",
    code: "WELCOME10",
    title: "Welcome 10%",
    type: "percent",
    value: 10,
    minimumSpend: 250_000,
    maximumDiscount: 100_000,
    perUserLimit: 1,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "coupon-isak50k",
    code: "ISAK50K",
    title: "Rp 50.000 off",
    type: "fixed",
    value: 50_000,
    minimumSpend: 500_000,
    perUserLimit: 1,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

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

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function CouponProvider({ children }: { children: ReactNode }) {
  const [coupons, setCoupons] = useState<Coupon[]>(() =>
    readJson<Coupon[]>(COUPONS_KEY, DEFAULT_COUPONS).map((c) => ({ ...c, code: normalizeCode(c.code) }))
  );
  const [claims, setClaims] = useState<CouponClaim[]>(() => readJson<CouponClaim[]>(CLAIMS_KEY, []));

  useEffect(() => writeJson(COUPONS_KEY, coupons), [coupons]);
  useEffect(() => writeJson(CLAIMS_KEY, claims), [claims]);

  /* ---------------- Supabase sync ---------------- */
  const hydratedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) {
        hydratedRef.current = true;
        return;
      }
      const [couponsRes, claimsRes] = await Promise.all([
        supabase.from("coupons").select("*").order("created_at", { ascending: true }),
        supabase.from("coupon_claims").select("*").limit(500),
      ]);
      if (!alive) return;
      hydratedRef.current = true;
      if (!couponsRes.error && couponsRes.data && couponsRes.data.length > 0) {
        setCoupons((prev) => {
          const byId = new Map<string, Coupon>();
          for (const c of prev) byId.set(c.id, c);
          for (const row of couponsRes.data as Record<string, unknown>[]) {
            byId.set(String(row.id), rowToCoupon(row));
          }
          return Array.from(byId.values());
        });
      }
      if (!claimsRes.error && claimsRes.data && claimsRes.data.length > 0) {
        const remote = (claimsRes.data as Record<string, unknown>[]).map((r) => ({
          couponId: String(r.coupon_id),
          email: String(r.email).toLowerCase(),
          orderId: r.order_id ? String(r.order_id) : "",
          claimedAt: r.claimed_at ? String(r.claimed_at) : new Date().toISOString(),
        }));
        setClaims((prev) => {
          const seen = new Map(prev.map((c) => [`${c.email}:${c.orderId}`, c]));
          for (const c of remote) seen.set(`${c.email}:${c.orderId}`, c);
          return Array.from(seen.values());
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const db = supabase;
    if (!db || coupons.length === 0) return;
    const t = window.setTimeout(() => {
      const usedByCoupon = new Map<string, number>();
      for (const c of claims) {
        usedByCoupon.set(c.couponId, (usedByCoupon.get(c.couponId) ?? 0) + 1);
      }
      void db
        .from("coupons")
        .upsert(
          coupons.map((c) => couponToRow(c, usedByCoupon.get(c.id) ?? 0)),
          { onConflict: "id" }
        )
        .then(
          () => undefined,
          () => undefined
        );
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupons, claims, hydratedRef.current]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const db = supabase;
    if (!db || claims.length === 0) return;
    void db
      .from("coupon_claims")
      .upsert(
        claims.map((c) => ({
          coupon_id: c.couponId,
          email: c.email,
          order_id: c.orderId || null,
          claimed_at: c.claimedAt,
        })),
        { onConflict: "coupon_id,email,order_id" }
      )
      .then(
        () => undefined,
        () => undefined
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, hydratedRef.current]);

  /* ---------------- helpers ---------------- */

  const evaluate = useCallback(
    (rawCode: string, subtotal: number, email?: string): CouponEvaluation => {
      const code = normalizeCode(rawCode);
      if (!code) return { ok: false, error: "Enter a coupon code first.", discount: 0 };
      const coupon = coupons.find((c) => normalizeCode(c.code) === code);
      if (!coupon) return { ok: false, error: `We don't recognise "${code}" — double-check the spelling.`, discount: 0 };
      if (!coupon.active) return { ok: false, error: `Code "${code}" is no longer available.`, discount: 0 };

      const now = Date.now();
      if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) {
        return { ok: false, error: `"${code}" starts ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(coupon.validFrom))}.`, discount: 0 };
      }
      if (coupon.validUntil && new Date(coupon.validUntil).getTime() < now) {
        return { ok: false, error: `"${code}" expired on ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(coupon.validUntil))}.`, discount: 0 };
      }
      if (coupon.minimumSpend > 0 && subtotal < coupon.minimumSpend) {
        return { ok: false, error: `"${code}" needs a minimum order of ${formatRp(coupon.minimumSpend)} — your subtotal is ${formatRp(subtotal)}.`, discount: 0 };
      }
      // The claims ledger is the single source of truth for usage.
      const usedCount = claims.filter((c) => c.couponId === coupon.id).length;
      if (coupon.usageLimit !== undefined && coupon.usageLimit > 0 && usedCount >= coupon.usageLimit) {
        return { ok: false, error: `"${code}" has reached its usage limit.`, discount: 0 };
      }
      if (email) {
        const mine = useForEmail(coupon, email);
        if (mine >= coupon.perUserLimit) {
          return { ok: false, error: `"${code}" has already been used ${mine} time${mine === 1 ? "" : "s"} on this email.`, discount: 0 };
        }
      }

      const raw =
        coupon.type === "percent"
          ? (subtotal * coupon.value) / 100
          : Math.min(coupon.value, subtotal);
      const capped = coupon.type === "percent" && coupon.maximumDiscount ? Math.min(raw, coupon.maximumDiscount) : raw;
      return { ok: true, coupon, discount: Math.round(Math.max(0, capped)) };
    },
    [coupons, claims]
  );

  function useForEmail(coupon: Coupon, email: string): number {
    return claims.filter(
      (c) => c.couponId === coupon.id && c.email.toLowerCase() === email.toLowerCase()
    ).length;
  }

  const claim = useCallback(
    (code: string, email: string, orderId: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const coupon = coupons.find((c) => normalizeCode(c.code) === normalizeCode(code));
      if (!coupon || !cleanEmail || !orderId) return;
      setClaims((prev) => {
        const exists = prev.some((c) => c.couponId === coupon.id && c.orderId === orderId);
        if (exists) return prev;
        return [
          ...prev,
          { couponId: coupon.id, email: cleanEmail, orderId, claimedAt: new Date().toISOString() },
        ];
      });
    },
    [coupons]
  );

  const releaseForOrder = useCallback((orderId: string) => {
    if (!orderId) return;
    setClaims((prev) => prev.filter((c) => c.orderId !== orderId));
  }, []);

  const addCoupon = useCallback((c: NewCoupon): Coupon | null => {
    const code = normalizeCode(c.code);
    if (!code) return null;
    if (coupons.some((x) => normalizeCode(x.code) === code)) return null;
    const coupon: Coupon = {
      id: c.id ?? `coupon-${Date.now().toString(36)}`,
      code,
      title: c.title?.trim() || code,
      type: c.type,
      value: c.value,
      minimumSpend: c.minimumSpend ?? 0,
      maximumDiscount: c.maximumDiscount,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit > 0 ? c.perUserLimit : 1,
      usedCount: 0,
      active: c.active ?? true,
      createdAt: new Date().toISOString(),
    };
    setCoupons((prev) => [...prev, coupon]);
    return coupon;
  }, [coupons]);

  const updateCoupon = useCallback((id: string, patch: Partial<Coupon>) => {
    setCoupons((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch };
        if (patch.code !== undefined) next.code = normalizeCode(patch.code);
        return next;
      })
    );
  }, []);

  const deleteCoupon = useCallback((id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo<CouponContextValue>(
    () => ({ coupons, addCoupon, updateCoupon, deleteCoupon, evaluate, claim, releaseForOrder }),
    [coupons, addCoupon, updateCoupon, deleteCoupon, evaluate, claim, releaseForOrder]
  );

  return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Row mapping                                                         */
/* ------------------------------------------------------------------ */

function couponToRow(c: Coupon, usedCount = 0): Record<string, unknown> {
  return {
    id: c.id,
    code: normalizeCode(c.code),
    title: c.title ?? "",
    type: c.type,
    value: c.value,
    minimum_spend: c.minimumSpend ?? 0,
    maximum_discount: c.maximumDiscount ?? null,
    valid_from: c.validFrom ?? null,
    valid_until: c.validUntil ?? null,
    usage_limit: c.usageLimit ?? null,
    per_user_limit: c.perUserLimit,
    used_count: usedCount,
    active: c.active,
  };
}

function rowToCoupon(row: Record<string, unknown>): Coupon {
  return {
    id: String(row.id),
    code: normalizeCode(String(row.code)),
    title: row.title ? String(row.title) : "",
    type: (row.type as CouponType) ?? "percent",
    value: Number(row.value ?? 0),
    minimumSpend: Number(row.minimum_spend ?? 0),
    maximumDiscount: row.maximum_discount != null ? Number(row.maximum_discount) : undefined,
    validFrom: row.valid_from ? String(row.valid_from) : undefined,
    validUntil: row.valid_until ? String(row.valid_until) : undefined,
    usageLimit: row.usage_limit != null ? Number(row.usage_limit) : undefined,
    perUserLimit: Number(row.per_user_limit ?? 1),
    usedCount: Number(row.used_count ?? 0),
    active: Boolean(row.active),
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
  };
}

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export function useCoupons(): CouponContextValue {
  const ctx = useContext(CouponContext);
  if (!ctx) throw new Error("useCoupons must be used within CouponProvider");
  return ctx;
}