import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  listGateways,
  saveGatewayConfig,
  setGatewayEnabled,
  removeGateway,
  testGatewayConnection,
  type GatewayResult,
  type GatewayRow,
} from "../lib/gatewayApi";
import { supabase } from "../lib/supabase";
import { useConfig } from "./ConfigContext";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CheckoutGateway {
  id: string;
  name: string;
  type: "api" | "manual" | "cod";
}

interface GatewayContextValue {
  /** All gateway rows from the DB (public columns only). Empty when Supabase is off. */
  gateways: GatewayRow[];
  /** Loaded from the DB; falls back to the localStorage config list. */
  checkoutGateways: CheckoutGateway[];
  /** True when Supabase is reachable and the DB list is the source of truth. */
  cloudEnabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  saveGateway: (payload: {
    slug: string;
    name: string;
    credentials: Record<string, string>;
    publicConfig: Record<string, unknown>;
    enabled?: boolean;
  }) => Promise<GatewayResult>;
  setEnabled: (slug: string, enabled: boolean) => Promise<GatewayResult>;
  remove: (slug: string) => Promise<GatewayResult>;
  testConnection: (slug: string, credentials: Record<string, string>) => Promise<GatewayResult>;
}

const GatewayContext = createContext<GatewayContextValue | null>(null);

export function GatewayProvider({ children }: { children: ReactNode }) {
  const { paymentGateways } = useConfig();
  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await listGateways();
    setGateways(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = await listGateways();
      if (alive) {
        setGateways(rows);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cloudEnabled = !!supabase && gateways.length > 0;

  const checkoutGateways = useMemo<CheckoutGateway[]>(() => {
    if (cloudEnabled) {
      return gateways
        .filter((g) => g.enabled)
        .map((g) => ({ id: g.slug, name: g.name, type: g.type }));
    }
    // Fallback: the localStorage config list keeps the demo running without Supabase.
    return paymentGateways.filter((g) => g.enabled).map((g) => ({ id: g.id, name: g.name, type: "manual" }));
  }, [cloudEnabled, gateways, paymentGateways]);

  const value = useMemo<GatewayContextValue>(
    () => ({
      gateways,
      checkoutGateways,
      cloudEnabled,
      loading,
      refresh,
      saveGateway: saveGatewayConfig,
      setEnabled: setGatewayEnabled,
      remove: removeGateway,
      testConnection: testGatewayConnection,
    }),
    [gateways, checkoutGateways, cloudEnabled, loading, refresh]
  );

  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGateways(): GatewayContextValue {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error("useGateways must be used within GatewayProvider");
  return ctx;
}