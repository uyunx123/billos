// Admin gateway management proxy.
// - "test": validates a provider connection (Midtrans / Xendit / Stripe) using
//   credentials sent from the admin wizard. Never stores them.
// - "save": persists gateway credentials + public display config to the
//   `payment_gateways` base table using the service role, so API keys never
//   reach the browser or the public view.
//
// CORS + verify_jwt disabled: the admin console calls this from the browser
// (the store's auth is client-side). Only non-sensitive payloads travel to
// the providers; secrets live in the base table, readable only server-side.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ManageBody {
  action: "test" | "save" | "remove" | "set-enabled";
  slug: string;
  credentials?: Record<string, string>;
  publicConfig?: Record<string, unknown>;
  name?: string;
  enabled?: boolean;
}

/** Validate a provider connection with live API calls. */
async function testProvider(slug: string, creds: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  try {
    if (slug === "midtrans") {
      const serverKey = creds.server_key?.trim();
      if (!serverKey) return { ok: false, message: "Enter the Midtrans server key first." };
      const isProduction = creds.environment === "production";
      const snapUrl = isProduction
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";
      const res = await fetch(snapUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${btoa(`${serverKey}:`)}`,
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: `isak-test-${Date.now()}`,
            gross_amount: 10000,
          },
        }),
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: "Midtrans rejected the server key (401). Double-check it and the environment." };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, message: `Midtrans returned ${res.status} — ${text.slice(0, 140)}` };
      }
      return { ok: true, message: `Connected to Midtrans (${isProduction ? "production" : "sandbox"}).` };
    }

    if (slug === "xendit") {
      const apiKey = creds.api_key?.trim();
      if (!apiKey) return { ok: false, message: "Enter the Xendit API key first." };
      const res = await fetch("https://api.xendit.co/balance?account_type=CASH", {
        headers: { Authorization: `Basic ${btoa(`${apiKey}:`)}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: "Xendit rejected the API key (401). Check the key and that it's enabled." };
      }
      if (!res.ok) return { ok: false, message: `Xendit returned ${res.status}.` };
      return { ok: true, message: "Connected to Xendit — balance endpoint reachable." };
    }

    if (slug === "stripe") {
      const secretKey = creds.secret_key?.trim();
      if (!secretKey) return { ok: false, message: "Enter the Stripe secret key first." };
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (res.status === 401) {
        return { ok: false, message: "Stripe rejected the secret key (401). Check the key and that it starts with sk_." };
      }
      if (!res.ok) return { ok: false, message: `Stripe returned ${res.status}.` };
      return { ok: true, message: "Connected to Stripe — account balance reachable." };
    }

    return { ok: false, message: `No live test available for "${slug}" — it's a manual method.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach the provider." };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ManageBody;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const json = (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (!body.slug) return json({ ok: false, message: "slug is required" }, 400);

    // Manual methods don't need a live test — validation happens in the wizard.
    if (body.action === "test") {
      const result = await testProvider(body.slug, body.credentials ?? {});
      return json(result);
    }

    if (body.action === "remove") {
      if (!supabaseUrl || !serviceKey) return json({ ok: false, message: "Supabase is not configured on the server." }, 500);
      const supabase = createClient(supabaseUrl, serviceKey);
      const { error } = await supabase.from("payment_gateways").delete().eq("slug", body.slug);
      if (error) return json({ ok: false, message: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "set-enabled") {
      if (!supabaseUrl || !serviceKey) return json({ ok: false, message: "Supabase is not configured on the server." }, 500);
      const supabase = createClient(supabaseUrl, serviceKey);
      const { error } = await supabase
        .from("payment_gateways")
        .update({ enabled: !!body.enabled, updated_at: new Date().toISOString() })
        .eq("slug", body.slug);
      if (error) return json({ ok: false, message: error.message }, 500);
      return json({ ok: true });
    }

    // "save" — upsert the gateway row with credentials + public display config.
    if (body.action === "save") {
      if (!supabaseUrl || !serviceKey) return json({ ok: false, message: "Supabase is not configured on the server." }, 500);
      const supabase = createClient(supabaseUrl, serviceKey);
      const row = {
        slug: body.slug,
        name: body.name?.trim() || body.slug,
        config: (body.credentials ?? {}) as Record<string, unknown>,
        public_config: (body.publicConfig ?? {}) as Record<string, unknown>,
        enabled: body.enabled ?? true,
        status: "connected",
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("payment_gateways").upsert(row, { onConflict: "slug" });
      if (error) return json({ ok: false, message: error.message }, 500);
      return json({ ok: true });
    }

    return json({ ok: false, message: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "gateway management failed";
    return new Response(JSON.stringify({ ok: false, message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});