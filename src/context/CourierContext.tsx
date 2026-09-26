import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useStore, type Order } from "./StoreContext";
import { supabase, functionsUrl } from "../lib/supabase";
import { normalizeBiteshipTracking, type CourierTracking } from "../lib/courier";

export interface CreateShipmentInput {
  order: Order;
  /** Biteship courier_company code, e.g. "jne". */
  courier: string;
  origin: {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    organization?: string;
    address: string;
    postalCode: string;
    note?: string;
  };
  orderNote?: string;
}

interface CourierContextValue {
  /** Live tracking per order id (null = fetched but not available yet). */
  tracking: Record<string, CourierTracking | null>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  /** Pulls the courier's live tracking for an order (auto-advances to Delivered). */
  refreshTracking: (orderId: string) => Promise<void>;
  /** Creates a real shipment via Biteship and attaches the returned AWB. */
  createShipment: (input: CreateShipmentInput) => Promise<{ ok: boolean; waybill?: string; error?: string }>;
  /** Attaches an AWB + courier code to an order (manual tracking numbers). */
  attachAwb: (orderId: string, awb: string, courierCode?: string) => void;
}

const CourierContext = createContext<CourierContextValue | null>(null);

const OFFLINE_MESSAGE =
  "Live courier tracking isn't available in this preview yet — connect Supabase to enable it.";

export function CourierProvider({ children }: { children: ReactNode }) {
  const { orders, setCourier, setOrderStatus } = useStore();
  const [tracking, setTracking] = useState<Record<string, CourierTracking | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});
  const inflight = useRef<Set<string>>(new Set());

  const refreshTracking = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      if (!order.awb || !order.courierCode) {
        setError((prev) => ({
          ...prev,
          [orderId]: "No tracking number attached to this order yet.",
        }));
        return;
      }
      if (inflight.current.has(orderId)) return;
      inflight.current.add(orderId);
      setLoading((prev) => ({ ...prev, [orderId]: true }));
      setError((prev) => ({ ...prev, [orderId]: null }));
      try {
        if (!supabase || !functionsUrl()) {
          setError((prev) => ({ ...prev, [orderId]: OFFLINE_MESSAGE }));
          return;
        }
        const { data, error: invokeError } = await supabase.functions.invoke("courier-tracking", {
          body: { action: "track", waybill: order.awb, courier: order.courierCode },
        });
        if (invokeError) throw invokeError;
        const t = normalizeBiteshipTracking((data as { tracking?: unknown })?.tracking);
        if (!t) {
          throw new Error("The courier hasn't returned tracking data yet — try again in a minute.");
        }
        setTracking((prev) => ({ ...prev, [orderId]: t }));
        // Auto-advance: when the courier confirms delivery, mark the order Delivered.
        if (t.statusKey === "delivered" && ["Shipped", "Picked", "In transit"].includes(order.status)) {
          setOrderStatus(orderId, "Delivered", `Courier tracking reports delivered — ${order.awb}`);
        }
      } catch (err) {
        setError((prev) => ({
          ...prev,
          [orderId]: err instanceof Error ? err.message : "Couldn't reach the courier — try again.",
        }));
      } finally {
        inflight.current.delete(orderId);
        setLoading((prev) => ({ ...prev, [orderId]: false }));
      }
    },
    [orders, setCourier, setOrderStatus]
  );

  const createShipment = useCallback(
    async (input: CreateShipmentInput): Promise<{ ok: boolean; waybill?: string; error?: string }> => {
      if (!supabase || !functionsUrl()) return { ok: false, error: OFFLINE_MESSAGE };
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("courier-tracking", {
          body: {
            action: "create",
            courier: input.courier,
            origin: input.origin,
            destination: {
              contactName: input.order.customer,
              contactPhone: input.order.phone ?? "",
              contactEmail: input.order.email ?? "",
              address: input.order.address ?? "",
              postalCode: input.order.postalCode ?? "",
              note: `${input.order.city ?? ""}${input.order.province ? `, ${input.order.province}` : ""}`.trim(),
            },
            items: input.order.items.map((it) => ({
              name: it.name,
              description: it.name,
              value: it.price,
              quantity: it.qty,
              weightGrams: 1000,
            })),
            orderNote: input.orderNote,
          },
        });
        if (invokeError) throw invokeError;
        const d = data as {
          success?: boolean;
          shipment?: { waybillId?: string; courierCompany?: string };
          error?: string;
          message?: string;
        };
        if (!d.success || !d.shipment?.waybillId) {
          throw new Error(d.message ?? d.error ?? "The courier didn't return a tracking number.");
        }
        const waybill = d.shipment.waybillId;
        const code = (d.shipment.courierCompany || input.courier).toLowerCase();
        setCourier(input.order.id, { awb: waybill, courierCode: code });
        return { ok: true, waybill };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Couldn't create the shipment — try again.",
        };
      }
    },
    [setCourier]
  );

  const attachAwb = useCallback(
    (orderId: string, awb: string, courierCode?: string) => {
      setCourier(orderId, { awb, courierCode });
    },
    [setCourier]
  );

  const value = useMemo<CourierContextValue>(
    () => ({ tracking, loading, error, refreshTracking, createShipment, attachAwb }),
    [tracking, loading, error, refreshTracking, createShipment, attachAwb]
  );

  return <CourierContext.Provider value={value}>{children}</CourierContext.Provider>;
}

export function useCourier(): CourierContextValue {
  const ctx = useContext(CourierContext);
  if (!ctx) throw new Error("useCourier must be used within CourierProvider");
  return ctx;
}
