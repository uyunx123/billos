// Admin integrations proxy.
// - "list":     which provider API keys are set (names only — values never
//               leave the server, via the Supabase Management API).
// - "set":      upsert an Edge Function secret (Management API POST /secrets).
// - "remove":   delete an Edge Function secret (Management API DELETE /secrets).
// - "test":     live-ping a provider using the ACTUAL stored secret.
// - "save_config": persist non-secret courier/gateway details to `app_config`
//               (service role — RLS only allows public reads).
// - "get_config": read the non-secret integration config (service role).
//
// CORS + verify_jwt disabled, matching the store's existing manage-gateway
// pattern: the admin console gates access client-side, and the management
// token itself never leaves this function.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** The only secret slots the admin page may manage. */
const SECRET_SLOTS = new Set([
  "BITESHIP_API_KEY",
  "MIDTRANS_SERVER_KEY",
  "MIDTRANS_IS_PRODUCTION",
  "XENDIT_API_KEY",
  "STRIPE_SECRET_KEY",
]);

const ALLOWED_SECRET_RE = /^[A-Z][A-Z0-9_]{2,63}$/;

function projectRef(): string | null {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  const ref = host.split(".")[0];
  return ref && ref.length > 0 ? ref : null;
}

function managementToken(): string | null {
  const t = Deno.env.get("SUPABASE_MANAGEMENT_TOKEN") ?? "";
  return t ? t.trim() : null;
}

interface MgmtSecret {
  name: string;
  digest?: string;
}

/** GET /v1/projects/{ref}/secrets — returns secret names (never values). */
async function listMgmtSecrets(ref: string, token: string): Promise<{ ok: boolean; names: string[]; message?: string }> {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, names: [], message: `Management API returned ${res.status} — check the token's scope.` };
    }
    const data = (await res.json()) as MgmtSecret[];
    return { ok: true, names: Array.isArray(data) ? data.map((s) => s.name) : [] };
  } catch (err) {
    return { ok: false, names: [], message: err instanceof Error ? err.message : "Could not reach the Management API." };
  }
}

async function setMgmtSecret(ref: string, token: string, name: string, value: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify([{ name, value }]),
    });
    if (!res.ok) {
      return { ok: false, message: `Management API returned ${res.status} — could not save the key.` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach the Management API." };
  }
}

async function deleteMgmtSecret(ref: string, token: string, name: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ secrets: [{ name }] }),
    });
    if (!res.ok) {
      return { ok: false, message: `Management API returned ${res.status} — could not delete the key.` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach the Management API." };
  }
}

/* ------------------------------------------------------------------ */
/* Live provider tests (uses the ACTUAL stored secret from Deno.env)   */
/* ------------------------------------------------------------------ */

async function testProvider(slot: string): Promise<{ ok: boolean; message: string }> {
  const key = (Deno.env.get(slot) ?? "").trim();
  if (!key) return { ok: false, message: "Key isn't configured yet — save it first." };

  try {
    if (slot === "BITESHIP_API_KEY") {
      const res = await fetch("https://api.biteship.com/v1/couriers", {
        headers: { Accept: "application/json", Authorization: `Biteship ${key}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: "Biteship rejected the API key (401/403) — double-check it." };
      }
      if (!res.ok) return { ok: false, message: `Biteship returned ${res.status}.` };
      return { ok: true, message: "Connected to Biteship — courier list reachable." };
    }

    if (slot === "MIDTRANS_SERVER_KEY") {
      const isProduction = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true";
      const snapUrl = isProduction
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";
      const res = await fetch(snapUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${btoa(`${key}:`)}`,
        },
        body: JSON.stringify({
          transaction_details: { order_id: `isak-test-${Date.now()}`, gross_amount: 10000 },
        }),
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: "Midtrans rejected the server key (401) — check it and the environment." };
      }
      if (!res.ok) return { ok: false, message: `Midtrans returned ${res.status}.` };
      return { ok: true, message: `Connected to Midtrans (${isProduction ? "production" : "sandbox"}).` };
    }

    if (slot === "XENDIT_API_KEY") {
      const res = await fetch("https://api.xendit.co/balance?account_type=CASH", {
        headers: { Authorization: `Basic ${btoa(`${key}:`)}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: "Xendit rejected the API key (401) — check that it's enabled." };
      }
      if (!res.ok) return { ok: false, message: `Xendit returned ${res.status}.` };
      return { ok: true, message: "Connected to Xendit — balance endpoint reachable." };
    }

    if (slot === "STRIPE_SECRET_KEY") {
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status === 401) {
        return { ok: false, message: "Stripe rejected the secret key (401) — check that it starts with sk_." };
      }
      if (!res.ok) return { ok: false, message: `Stripe returned ${res.status}.` };
      return { ok: true, message: "Connected to Stripe — account balance reachable." };
    }

    return { ok: false, message: "No live test available for that key." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach the provider." };
  }
}

/* ------------------------------------------------------------------ */
/* Non-secret config (courier origin, enabled couriers, gateway info)  */
/* ------------------------------------------------------------------ */

async function saveAppConfig(id: string, config: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return { ok: false, message: "Supabase isn't configured on the server." };
  try {
    const supabase = createClient(url, serviceKey);
    const { error } = await supabase
      .from("app_config")
      .upsert({ id, config, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not save the config." };
  }
}

async function getAppConfig(id: string): Promise<Record<string, unknown> | null> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return null;
  try {
    const supabase = createClient(url, serviceKey);
    const { data } = await supabase.from("app_config").select("config").eq("id", id).maybeSingle();
    const cfg = (data?.config ?? null) as Record<string, unknown> | null;
    return cfg && typeof cfg === "object" ? cfg : null;
  } catch {
    return null;
  }
}

interface ManageBody {
  action: "list" | "set" | "remove" | "test" | "save_config" | "get_config";
  name?: string;
  value?: string;
  configId?: string;
  config?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ManageBody;
    const action = body.action;

    if (action === "save_config") {
      const id = body.configId?.trim() || "courier";
      const config = body.config && typeof body.config === "object" ? body.config : {};
      const result = await saveAppConfig(id, config);
      return json(result.ok ? { ok: true, configId: id } : result, result.ok ? 200 : 500);
    }

    if (action === "get_config") {
      const id = body.configId?.trim() || "courier";
      const config = await getAppConfig(id);
      return json({ ok: true, configId: id, config: config ?? {} });
    }

    // Everything below talks to the Supabase Management API.
    const ref = projectRef();
    const token = managementToken();
    if (!ref || !token) {
      return json(
        {
          ok: false,
          message:
            "The management token isn't configured yet. The store owner needs to add SUPABASE_MANAGEMENT_TOKEN (a Supabase Personal Access Token) so keys can be stored as Edge Function secrets.",
        },
        503
      );
    }

    if (action === "list") {
      const res = await listMgmtSecrets(ref, token);
      const slots = Array.from(SECRET_SLOTS).map((name) => ({
        name,
        set: res.ok ? res.names.includes(name) : false,
      }));
      return json({ ok: res.ok, slots, message: res.message });
    }

    if (action === "set" || action === "remove") {
      const name = body.name?.trim() ?? "";
      if (!ALLOWED_SECRET_RE.test(name) || !SECRET_SLOTS.has(name)) {
        return json({ ok: false, message: `"${name || "(empty)"}" is not a key the store manages here.` }, 400);
      }
      if (action === "set") {
        const value = body.value ?? "";
        if (!value.trim()) return json({ ok: false, message: "The key value can't be empty." }, 400);
        if (name === "MIDTRANS_IS_PRODUCTION" && value !== "true" && value !== "false") {
          return json({ ok: false, message: "MIDTRANS_IS_PRODUCTION must be \"true\" or \"false\"." }, 400);
        }
        const res = await setMgmtSecret(ref, token, name, value);
        return json(res, res.ok ? 200 : 500);
      }
      const res = await deleteMgmtSecret(ref, token, name);
      return json(res, res.ok ? 200 : 500);
    }

    if (action === "test") {
      const name = body.name?.trim() ?? "";
      if (!SECRET_SLOTS.has(name)) {
        return json({ ok: false, message: `"${name || "(empty)"}" isn't a known key slot.` }, 400);
      }
      const result = await testProvider(name);
      return json(result);
    }

    return json({ ok: false, message: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "config management failed";
    return json({ ok: false, message }, 500);
  }
});
