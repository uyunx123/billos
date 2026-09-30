import { supabase } from "./supabase";

/* ------------------------------------------------------------------ */
/* Admin integrations API — proxies through the manage-config Edge     */
/* Function so provider API keys are stored as Supabase Edge Function  */
/* secrets (never in the browser or localStorage) and courier details  */
/* are persisted server-side in `app_config`.                          */
/* ------------------------------------------------------------------ */

export type SecretSlotName =
  | "BITESHIP_API_KEY"
  | "MIDTRANS_SERVER_KEY"
  | "MIDTRANS_IS_PRODUCTION"
  | "XENDIT_API_KEY"
  | "STRIPE_SECRET_KEY";

export interface SecretSlotStatus {
  name: SecretSlotName;
  set: boolean;
  /**
   * Recorded value for non-secret slots (currently the Midtrans environment
   * toggle, "true"/"false"). Never populated for real API keys — the server
   * returns names only for those.
   */
  value?: string;
}

export interface IntegrationResult {
  ok: boolean;
  message?: string;
}

export interface CourierIntegrationConfig {
  /** Store origin defaults used when creating real courier shipments. */
  originAddress?: string;
  originPostalCode?: string;
  originPhone?: string;
  originNote?: string;
  /** Courier codes the store allows for shipment creation (empty = all). */
  enabledCouriers?: string[];
}

/** Display metadata for the admin page (mirrors the server allowlist). */
export const SECRET_SLOT_META: Record<
  SecretSlotName,
  { label: string; hint: string; provider: "courier" | "payment" }
> = {
  BITESHIP_API_KEY: {
    label: "Biteship API key",
    hint: "Powers live courier tracking and real shipment creation for JNE, J&T, SiCepat, AnterAja and more.",
    provider: "courier",
  },
  MIDTRANS_SERVER_KEY: {
    label: "Midtrans server key",
    hint: 'Starts with "SB-Mid-server-…" (sandbox) or "Mid-server-…" (production). Enables live Snap payments at checkout.',
    provider: "payment",
  },
  MIDTRANS_IS_PRODUCTION: {
    label: "Midtrans environment",
    hint: "Set to true for live payments, false for sandbox testing.",
    provider: "payment",
  },
  XENDIT_API_KEY: {
    label: "Xendit API key",
    hint: 'Starts with "xnd_development_…" or "xnd_production_…". Enables hosted payment invoices.',
    provider: "payment",
  },
  STRIPE_SECRET_KEY: {
    label: "Stripe secret key",
    hint: 'Starts with "sk_test_…" or "sk_live_…". Enables card payments via Payment Links.',
    provider: "payment",
  },
};

type ConfigResponse<T> = T & { ok: boolean; message?: string };

async function invokeConfig<T>(body: Record<string, unknown>): Promise<ConfigResponse<T>> {
  if (!supabase) {
    return { ok: false, message: "Supabase isn't connected — integration settings can't be saved right now." } as ConfigResponse<T>;
  }
  try {
    const { data, error } = await supabase.functions.invoke("manage-config", { body });
    if (error) return { ok: false, message: error.message || "Couldn't reach the configuration service." } as ConfigResponse<T>;
    return (data ?? {}) as ConfigResponse<T>;
  } catch {
    return { ok: false, message: "Couldn't reach the configuration service — check your connection and try again." } as ConfigResponse<T>;
  }
}

/** Which provider keys are currently stored (names only — values never return). */
export async function listSecretSlots(): Promise<{ ok: boolean; slots: SecretSlotStatus[]; message?: string }> {
  const res = await invokeConfig<{ slots: SecretSlotStatus[] }>({ action: "list" });
  return { ok: res.ok, slots: res.slots ?? [], message: res.message };
}

/** Save (or replace) a provider API key as an Edge Function secret. */
export function setSecret(name: SecretSlotName, value: string): Promise<ConfigResponse<IntegrationResult>> {
  return invokeConfig<IntegrationResult>({ action: "set", name, value });
}

/** Delete a provider API key from the Edge Function secrets. */
export function removeSecret(name: SecretSlotName): Promise<ConfigResponse<IntegrationResult>> {
  return invokeConfig<IntegrationResult>({ action: "remove", name });
}

/** Live-ping the provider using the stored key (never typed by the user). */
export function testSecret(name: SecretSlotName): Promise<ConfigResponse<IntegrationResult>> {
  return invokeConfig<IntegrationResult>({ action: "test", name });
}

/** Persist non-secret courier integration details (origin + enabled list). */
export function saveCourierConfig(config: CourierIntegrationConfig): Promise<ConfigResponse<IntegrationResult>> {
  return invokeConfig<IntegrationResult>({ action: "save_config", configId: "courier", config });
}

/** Read the stored courier integration details (empty object when unset). */
export async function getCourierConfig(): Promise<CourierIntegrationConfig> {
  const res = await invokeConfig<{ config: CourierIntegrationConfig }>({ action: "get_config", configId: "courier" });
  return res.config ?? {};
}

/**
 * Theme & layout settings (palette / width / radius) persisted to the
 * `app_config` table (configId "theme") so the store's look follows it
 * across devices. Purely non-secret display settings.
 */
export function saveThemeConfig(config: Record<string, unknown>): Promise<ConfigResponse<IntegrationResult>> {
  return invokeConfig<IntegrationResult>({ action: "save_config", configId: "theme", config });
}

/** Read the stored theme & layout settings (empty object when unset). */
export async function getThemeConfig(): Promise<Record<string, unknown>> {
  const res = await invokeConfig<{ config: Record<string, unknown> }>({ action: "get_config", configId: "theme" });
  return res.config && typeof res.config === "object" ? res.config : {};
}