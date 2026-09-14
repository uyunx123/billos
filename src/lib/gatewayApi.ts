import { supabase } from "./supabase";
import type { GatewayType } from "../data/gatewayCatalog";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type GatewayStatus = "not_configured" | "configuring" | "connected" | "error";

export interface GatewayRow {
  id: string;
  slug: string;
  name: string;
  type: GatewayType;
  enabled: boolean;
  status: GatewayStatus;
  /** Display-only details (account, instructions, picture) — safe for the public view. */
  public_config: Record<string, unknown>;
  sort_order: number;
  updated_at?: string;
}

export interface GatewayResult {
  ok: boolean;
  message?: string;
}

/* ------------------------------------------------------------------ */
/* Public reads — the `payment_gateways_public` view (no credentials)  */
/* ------------------------------------------------------------------ */

/** List every gateway row (public columns only). Empty when Supabase is off. */
export async function listGateways(): Promise<GatewayRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("payment_gateways_public")
    .select("id,slug,name,type,enabled,status,public_config,sort_order,updated_at")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as GatewayRow[];
}

/* ------------------------------------------------------------------ */
/* Admin actions — proxied through the manage-gateway Edge Function    */
/* (service role persists credentials; the browser never stores them)  */
/* ------------------------------------------------------------------ */

async function invokeGateway(body: Record<string, unknown>): Promise<GatewayResult> {
  if (!supabase) {
    return { ok: false, message: "Supabase isn't connected — gateway changes can't be saved right now." };
  }
  try {
    const { data, error } = await supabase.functions.invoke("manage-gateway", { body });
    if (error) return { ok: false, message: error.message || "Couldn't reach the gateway service." };
    const result = (data ?? {}) as GatewayResult;
    return result.ok ? result : { ok: false, message: result.message ?? "The gateway service rejected the request." };
  } catch {
    return { ok: false, message: "Couldn't reach the gateway service — check your connection and try again." };
  }
}

/** Live-test an API gateway's credentials (never stored by this call). */
export function testGatewayConnection(slug: string, credentials: Record<string, string>): Promise<GatewayResult> {
  return invokeGateway({ action: "test", slug, credentials });
}

/** Save (or update) a configured gateway — credentials + display config. */
export function saveGatewayConfig(payload: {
  slug: string;
  name: string;
  credentials: Record<string, string>;
  publicConfig: Record<string, unknown>;
  enabled?: boolean;
}): Promise<GatewayResult> {
  return invokeGateway({
    action: "save",
    slug: payload.slug,
    name: payload.name,
    credentials: payload.credentials,
    publicConfig: payload.publicConfig,
    enabled: payload.enabled ?? true,
  });
}

/** Toggle a gateway on/off without touching its saved credentials. */
export function setGatewayEnabled(slug: string, enabled: boolean): Promise<GatewayResult> {
  return invokeGateway({ action: "set-enabled", slug, enabled });
}

/** Remove a gateway from the configured list. */
export function removeGateway(slug: string): Promise<GatewayResult> {
  return invokeGateway({ action: "remove", slug });
}

/* ------------------------------------------------------------------ */
/* Picture upload helper — resizes to a compact data URL (no storage   */
/* bucket needed; consistent with the rest of this localStorage app).  */
/* ------------------------------------------------------------------ */

export function fileToPictureDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 640;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Couldn't process that image."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("That file isn't a readable image."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}