import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, PackageOpen, ReceiptText, ShoppingBag, XCircle } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCoupons } from "../context/CouponContext";
import { usePageMeta } from "../hooks/usePageMeta";

/** Return page after the (demo or live) payment gateway. */
export default function CheckoutCompletePage() {
  const [params] = useSearchParams();
  const { clear } = useCart();
  const { releaseForOrder } = useCoupons();
  const orderId = params.get("order");
  const result = params.get("result");
  const cancelled = result === "cancel";

  usePageMeta({
    title: cancelled ? "Payment cancelled — ISAK Billiard Co." : "Payment submitted — ISAK Billiard Co.",
    description: cancelled
      ? "Your payment was cancelled. Your order is saved and you can retry checkout anytime."
      : "Payment received. Track your ISAK Billiard Co. order in real time.",
  });

  useEffect(() => {
    if (!cancelled) clear();
  }, [cancelled, clear]);

  // A cancelled order never used its coupon — give it back so it can be used
  // on the next attempt.
  useEffect(() => {
    if (cancelled && orderId) releaseForOrder(orderId);
  }, [cancelled, orderId, releaseForOrder]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <span
          className={`mx-auto grid h-20 w-20 place-items-center rounded-full shadow-lift ${
            cancelled
              ? "bg-destructive/10 text-destructive ring-1 ring-destructive/25"
              : "bg-gradient-to-br from-primary-500 to-primary-800 text-on-primary"
          }`}
        >
          {cancelled ? (
            <XCircle className="h-10 w-10" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-6 font-heading text-3xl font-bold tracking-tight">
          {cancelled ? "Payment cancelled" : "Payment submitted"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-foreground/65">
          {cancelled ? (
            <>
              Order <span className="font-bold text-foreground">{orderId}</span> was not paid — no
              charges were made. When you&apos;re ready, the same items are still waiting in your basket.
            </>
          ) : (
            <>
              Order <span className="font-bold text-foreground">{orderId}</span> is in. The store
              confirms each payment before packing, and every step — from prepared to delivered — shows
              up on your tracking page with timestamps.
            </>
          )}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {!cancelled && (
            <>
              <Link to={`/receipt/${encodeURIComponent(orderId ?? "")}`} className="btn btn-accent sm:flex-none">
                <ReceiptText className="h-4 w-4" aria-hidden="true" /> View receipt
              </Link>
              <Link to="/orders" className="btn btn-primary sm:flex-none">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Track my order
              </Link>
            </>
          )}
          {cancelled && (
            <Link to="/checkout" className="btn btn-primary sm:flex-none">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Retry checkout
            </Link>
          )}
          <Link to="/shop" className="btn btn-ghost sm:flex-none">
            <PackageOpen className="h-4 w-4" aria-hidden="true" /> Keep shopping
          </Link>
        </div>

        {cancelled && (
          <p className="mt-6 text-xs text-foreground/45">
            Cancelled orders are kept for your reference — records are restored to stock automatically.
          </p>
        )}
      </div>
    </div>
  );
}