// Create a payment session for a placed order.
// - If MIDTRANS_SERVER_KEY is set as an Edge Function secret, creates a
//   Midtrans Snap transaction and returns its hosted redirect_url.
// - Otherwise returns mode:"demo" and the client sends the customer to the
//   built-in demo gateway so the store stays fully testable offline.
//
// CORS + no hard JWT requirement: guests are allowed to check out.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Resolve Midtrans credentials: env secret first, then the admin-configured
 * gateway row (service role, so the server key never leaves the server). */
async function resolveMidtransCredentials() {
  const fromEnv = {
    serverKey: Deno.env.get("MIDTRANS_SERVER_KEY") ?? "",
    isProduction: Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true",
  };
  if (fromEnv.serverKey) return fromEnv;

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !serviceKey) return { serverKey: "", isProduction: false };

  try {
    const supabase = createClient(url, serviceKey);
    const { data, error } = await supabase
      .from("payment_gateways")
      .select("config")
      .eq("slug", "midtrans")
      .maybeSingle();
    if (error || !data) return { serverKey: "", isProduction: false };
    const config = (data.config ?? {}) as Record<string, unknown>;
    return {
      serverKey: String(config.server_key ?? ""),
      isProduction: config.environment === "production",
    };
  } catch {
    return { serverKey: "", isProduction: false };
  }
}

interface CreateOrderBody {
  orderId: string;
  amount: number;
  currency?: string;
  /** Gateway id chosen at checkout — qris | va | ewallet | card (mapped to Midtrans channels). */
  paymentMethodId?: string;
  customer?: { name?: string; email?: string; phone?: string };
  items?: { id: string; name: string; price: number; quantity: number }[];
  returnUrl?: string;
}

/** Maps the store's checkout gateway id to Midtrans Snap connection channels. */
function enabledPaymentsFor(methodId?: string): string[] | undefined {
  switch (methodId) {
    case "qris":
      return ["qris"];
    case "va":
      return ["bank_transfer"];
    case "ewallet":
      return ["gopay", "ovo", "shopeepay"];
    case "card":
      return ["credit_card"];
    default:
      return undefined; // let Snap show its full default set
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { serverKey, isProduction } = await resolveMidtransCredentials();

  try {
    const body = (await req.json()) as CreateOrderBody;
    if (!body.orderId || !Number.isFinite(body.amount) || body.amount <= 0) {
      return new Response(JSON.stringify({ error: "orderId and a positive amount are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No server key -> client should use the built-in demo gateway.
    if (!serverKey) {
      return new Response(JSON.stringify({ mode: "demo", redirect_url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const snapUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const enabledPayments = enabledPaymentsFor(body.paymentMethodId);
    const payload = {
      transaction_details: { order_id: body.orderId, gross_amount: body.amount },
      item_details: (body.items ?? []).map((it) => ({
        id: it.id,
        price: it.price,
        quantity: it.quantity,
        name: it.name,
      })),
      customer_details: {
        first_name: body.customer?.name ?? "Customer",
        email: body.customer?.email ?? "",
        phone: body.customer?.phone ?? "",
      },
      // Only surface the connection the customer picked at checkout.
      ...(enabledPayments ? { enabled_payments: enabledPayments } : {}),
      callbacks: {
        finish: body.returnUrl ?? "",
        error: body.returnUrl ?? "",
        pending: body.returnUrl ?? "",
      },
      expiry: { unit: "hours", duration: 2, start_time: new Date().toISOString() },
    };

    const res = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${btoa(`${serverKey}:`)}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as { token?: string; redirect_url?: string; error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? `Midtrans error ${res.status}`);
    }

    return new Response(JSON.stringify({ mode: "midtrans", redirect_url: data.redirect_url ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "could not create payment session";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});