import type { Order } from "../context/StoreContext";
import { supabase, functionsUrl } from "./supabase";

export interface PaymentRedirect {
  mode: "midtrans" | "demo";
  url: string;
  error?: string;
}

/**
 * Creates a payment session and returns the URL the browser should be
 * redirected to. When a Midtrans server key is configured on the Edge
 * Function, the customer is sent to the live Midtrans Snap page; otherwise
 * they land on the built-in demo gateway.
 */
export async function createPaymentRedirect(order: Order): Promise<PaymentRedirect> {
  const origin = window.location.origin;
  const returnUrl = `${origin}/checkout/complete?order=${encodeURIComponent(order.id)}`;

  const fallback: PaymentRedirect = {
    mode: "demo",
    url: `${origin}/gateway/${encodeURIComponent(order.id)}?return=${encodeURIComponent(returnUrl)}`,
  };

  if (!supabase || !functionsUrl()) return fallback;

  try {
    const { data, error } = await supabase.functions.invoke("create-payment", {
      body: {
        orderId: order.id,
        amount: order.total,
        currency: "IDR",
        paymentMethodId: order.paymentMethodId,
        customer: { name: order.customer, email: order.email ?? "", phone: order.phone ?? "" },
        items: order.items.map((it) => ({
          id: it.productId,
          name: it.name,
          price: it.price,
          quantity: it.qty,
        })),
        returnUrl,
      },
    });
    if (error) return fallback;
    const url = (data as { redirect_url?: string })?.redirect_url;
    return url ? { mode: "midtrans", url } : fallback;
  } catch {
    return fallback;
  }
}