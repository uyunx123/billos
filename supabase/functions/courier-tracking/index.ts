// Live courier tracking for the storefront.
// - action "track":  proxies Biteship's PUBLIC tracking endpoint
//   (GET /v1/trackings/{waybill}/couriers/{courier}), so guests can follow
//   their parcel without exposing any credentials.
// - action "create": creates a real shipment via Biteship's Orders API
//   (POST /v1/orders). It only works when the owner has stored
//   BITESHIP_API_KEY as an Edge Function secret — the key never leaves the
//   server, and the capability is simply unavailable until the owner opts in.
//
// CORS enabled + no hard JWT requirement (guest checkout/tracking), matching
// the store's existing create-payment function.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BITESHIP_BASE = "https://api.biteship.com/v1";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function cleanText(v: unknown, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}

function errorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const d = body as Record<string, unknown>;
  return String(d.message ?? d.error ?? d.errors ?? "");
}

interface OriginInput {
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  organization?: string;
  address?: string;
  postalCode?: string;
  note?: string;
}

interface DestinationInput {
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  postalCode?: string;
  note?: string;
}

interface CreateBody {
  action?: string;
  courier?: string;
  origin?: OriginInput;
  destination?: DestinationInput;
  items?: { name?: string; description?: string; value?: number; quantity?: number; weightGrams?: number }[];
  orderNote?: string;
}

async function handleTrack(waybill: string, courier: string) {
  const apiKey = Deno.env.get("BITESHIP_API_KEY") ?? "";
  const headers: Record<string, string> = { Accept: "application/json" };
  // The public tracking endpoint needs no key; sending one when present just
  // unlocks the keyed rate limits.
  if (apiKey) headers["Authorization"] = `Biteship ${apiKey}`;

  const res = await fetch(
    `${BITESHIP_BASE}/trackings/${encodeURIComponent(waybill)}/couriers/${encodeURIComponent(courier)}`,
    { headers }
  );
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(
      "TRACKING_ERROR",
      errorMessage(data) || `The courier returned ${res.status} for that tracking number.`
    );
  }
  return data;
}

async function handleCreate(body: CreateBody) {
  const apiKey = Deno.env.get("BITESHIP_API_KEY") ?? "";
  if (!apiKey) {
    throw new ApiError(
      "NO_API_KEY",
      "Biteship isn't connected yet — the store owner needs to add the Biteship API key (Edge Function secret BITESHIP_API_KEY)."
    );
  }

  const origin = body.origin ?? {};
  const destination = body.destination ?? {};
  const items = (body.items ?? [])
    .slice(0, 50)
    .map((it) => ({
      name: cleanText(it.name, 100),
      description: cleanText(it.description, 200),
      value: Math.max(0, Math.round(Number(it.value) || 0)),
      quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
      weight: Math.max(1, Math.round(Number(it.weightGrams) || 100)),
    }))
    .filter((it) => it.name);

  if (
    items.length === 0 ||
    !origin.address ||
    !origin.postalCode ||
    !destination.address ||
    !destination.postalCode ||
    !destination.contactName
  ) {
    throw new ApiError(
      "MISSING_FIELDS",
      "Origin and destination need an address + postal code, the destination needs a recipient name, and at least one item is required."
    );
  }

  const payload = {
    shipper_contact_name: cleanText(origin.contactName, 80) || "ISAK Billiard Co.",
    shipper_contact_phone: cleanText(origin.contactPhone, 20) || "",
    shipper_contact_email: cleanText(origin.contactEmail, 120) || "",
    shipper_organization: cleanText(origin.organization, 80) || "",
    origin_contact_name: cleanText(origin.contactName, 80) || "ISAK Billiard Co.",
    origin_contact_phone: cleanText(origin.contactPhone, 20) || "",
    origin_address: cleanText(origin.address, 200),
    origin_postal_code: cleanText(origin.postalCode, 10),
    origin_note: cleanText(origin.note, 100) || "",
    destination_contact_name: cleanText(destination.contactName, 80),
    destination_contact_phone: cleanText(destination.contactPhone, 20) || "",
    destination_contact_email: cleanText(destination.contactEmail, 120) || "",
    destination_address: cleanText(destination.address, 200),
    destination_postal_code: cleanText(destination.postalCode, 10),
    destination_note: cleanText(destination.note, 120) || "",
    courier_company: cleanText(body.courier, 20).toLowerCase(),
    courier_type: "REG",
    delivery_type: "now",
    order_note: cleanText(body.orderNote, 200) || "",
    items,
  };

  const res = await fetch(`${BITESHIP_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Biteship ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(
      "BITESHIP_ERROR",
      errorMessage(data) || `Biteship rejected the order (${res.status}).`
    );
  }
  const d = data as Record<string, unknown>;
  const courierObj = (d.courier ?? {}) as Record<string, unknown>;
  return {
    orderId: String(d.id ?? ""),
    waybillId: String(courierObj.waybill_id ?? d.waybill_id ?? ""),
    courierCompany: String(courierObj.company ?? body.courier ?? ""),
    status: String(d.status ?? "pending"),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  try {
    const body = (await req.json()) as CreateBody & { waybill?: string };

    if (body.action === "track") {
      const waybill = cleanText(body.waybill, 40);
      const courier = cleanText(body.courier, 30).toLowerCase();
      if (!waybill || !courier) {
        return json({ error: "waybill and courier are required" }, 400);
      }
      const tracking = await handleTrack(waybill, courier);
      return json({ success: true, tracking });
    }

    if (body.action === "create") {
      const shipment = await handleCreate(body);
      return json({ success: true, shipment });
    }

    return json({ error: 'action must be "track" or "create"' }, 400);
  } catch (err) {
    if (err instanceof ApiError) {
      return json(
        { error: err.code, message: err.message },
        err.code === "NO_API_KEY" ? 400 : 502
      );
    }
    const message = err instanceof Error ? err.message : "courier request failed";
    return json({ error: "COURIER_ERROR", message }, 502);
  }
});
