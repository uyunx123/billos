import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "../context/StoreContext";
import { useGateways } from "../context/GatewayContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { formatIDR } from "../lib/format";

/** Simulated channel descriptions for each gateway the checkout can send here. */
const CHANNELS: Record<
  string,
  { title: string; hint: string; icon: LucideIcon }
> = {
  qris: {
    title: "QRIS",
    hint: "Scan the QR with any e-wallet or bank app (GoPay, OVO, ShopeePay, DANA, BCA, …).",
    icon: QrCode,
  },
  va: {
    title: "Virtual Account",
    hint: "A BCA / BNI / BRI account number is generated — transfer the exact amount before the 2-hour expiry.",
    icon: Landmark,
  },
  ewallet: {
    title: "e-Wallet",
    hint: "Pay with GoPay, OVO or ShopeePay — the app asks you to approve the payment.",
    icon: Wallet,
  },
  card: {
    title: "Credit / Debit card",
    hint: "Enter card details on the secure Snap page — Visa & Mastercard are supported.",
    icon: CreditCard,
  },
};

/**
 * Built-in demo payment gateway. In production the customer is redirected to
 * Midtrans Snap (via the `create-payment` Edge Function); this page exists so
 * the whole flow is testable without any server key configured.
 */
export default function GatewayDemoPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const { orders, products, updatePaymentStatus, setOrderStatus, updateStock } = useStore();
  const { gateways } = useGateways();
  const [busy, setBusy] = useState<null | "pay" | "cancel">(null);

  usePageMeta({ title: "Payment gateway — ISAK Billiard Co." });

  const order = orders.find((o) => o.id === id);

  const finish = useCallback(
    (result: "success" | "cancel") => {
      const ret = params.get("return");
      if (ret && ret.startsWith(window.location.origin)) {
        const url = new URL(ret);
        url.searchParams.set("result", result);
        window.location.href = url.toString();
        return;
      }
      window.location.href = `${window.location.origin}/checkout/complete?order=${encodeURIComponent(id ?? "")}&result=${result}`;
    },
    [params, id]
  );

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-8 w-8" aria-hidden="true" />
        </p>
        <h1 className="mt-4 font-heading text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-foreground/60">
          We couldn&apos;t find that order in this browser — it may have been placed on another device.
        </p>
        <Link to="/checkout" className="btn btn-primary mt-6">
          Back to checkout
        </Link>
      </div>
    );
  }
  const o = order;

  const alreadyPaid = o.paymentStatus === "submitted" || o.paymentStatus === "accepted";
  // A manual gateway configured by the admin (bank transfer / QRIS / COD) shows
  // its real account details, instructions and picture — not the demo copy.
  const manualGateway = gateways.find((g) => g.slug === o.paymentMethodId && (g.type === "manual" || g.type === "cod") && g.enabled);
  const manual = manualGateway
    ? {
        title: manualGateway.name || o.payment || "Payment",
        icon: manualGateway.slug === "bank_transfer" ? Landmark : manualGateway.slug === "qris" ? QrCode : Wallet,
        accountName: String(manualGateway.public_config?.account_name ?? ""),
        accountNumber: String(manualGateway.public_config?.account_number ?? ""),
        bankName: String(manualGateway.public_config?.bank_name ?? ""),
        instructions: String(manualGateway.public_config?.instructions ?? ""),
        picture: String(manualGateway.public_config?.picture ?? ""),
      }
    : null;
  const channel = !manual
    ? (CHANNELS[o.paymentMethodId ?? ""] ?? {
        title: o.payment || "Payment",
        hint: "Complete the transfer to confirm your order. A live store redirects to Midtrans Snap.",
        icon: CreditCard,
      })
    : null;
  const ChannelIcon = channel?.icon ?? manual?.icon ?? CreditCard;

  async function handlePay() {
    setBusy("pay");
    updatePaymentStatus(o.id, "submitted");
    await new Promise((r) => setTimeout(r, 900));
    finish("success");
  }

  async function handleCancel() {
    setBusy("cancel");
    if (o.status === "Pending" && !alreadyPaid) {
      // Return the reserved stock and cancel the order.
      o.items.forEach((it) => {
        const p = products.find((prod) => prod.id === it.productId);
        if (p) updateStock(p.id, p.stock + it.qty);
      });
      setOrderStatus(o.id, "Cancelled", "Payment cancelled by the customer");
    }
    await new Promise((r) => setTimeout(r, 500));
    finish("cancel");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-primary-200">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {manual ? "Payment instructions" : "Simulated payment gateway"}
      </p>
      <h1 className="mt-2 text-center font-heading text-2xl font-bold tracking-tight">
        Complete your payment
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm text-foreground/60">
        {manual
          ? `Pay with ${manual.title}, then confirm below so we can start packing your order.`
          : "This is the built-in demo gateway. A live store redirects to Midtrans Snap, locked to your chosen method — QRIS, VA, e-wallet or card."}
      </p>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <span className="text-sm font-semibold text-foreground/70">Order {o.id}</span>
          <span className="font-heading text-xl font-bold">{formatIDR(o.total)}</span>
        </div>
        <ul className="divide-y divide-border/70 text-sm">
          {o.items.map((it) => (
            <li key={it.productId} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 truncate text-foreground/80">
                {it.name} <span className="text-foreground/45">× {it.qty}</span>
              </span>
              <span className="font-semibold">{formatIDR(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>

        {manual ? (
          <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-200 ring-1 ring-primary/15">
                <ChannelIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">{manual.title}</p>
                <p className="text-xs text-foreground/55">Pay the account below, then confirm your payment.</p>
              </div>
            </div>

            {(manual.accountName || manual.accountNumber || manual.bankName) && (
              <dl className="mt-4 space-y-2 rounded-xl bg-white/5 p-4 text-sm">
                {manual.accountName && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground/55">Account holder</dt>
                    <dd className="font-bold">{manual.accountName}</dd>
                  </div>
                )}
                {manual.bankName && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground/55">Bank / e-wallet</dt>
                    <dd className="font-bold">{manual.bankName}</dd>
                  </div>
                )}
                {manual.accountNumber && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-foreground/55">Account number</dt>
                    <dd className="font-heading text-base font-bold tracking-wide text-primary-200">{manual.accountNumber}</dd>
                  </div>
                )}
              </dl>
            )}

            {manual.picture && (
              <div className="mt-4 flex justify-center">
                <img
                  src={manual.picture}
                  alt={`${manual.title} payment picture`}
                  className="max-h-64 rounded-2xl border border-border bg-white/5 object-contain p-2"
                />
              </div>
            )}

            {manual.instructions && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/45">How to pay</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">{manual.instructions}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 p-4 ring-1 ring-primary/15">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary-200 shadow-soft ring-1 ring-primary/10">
              <ChannelIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{channel?.title} — demo</p>
              <p className="text-xs text-foreground/60">{channel?.hint}</p>
            </div>
            {channel?.title === "e-Wallet" && (
              <span className="ml-auto hidden shrink-0 flex-col gap-0.5 sm:flex" aria-hidden="true">
                <span className="flex gap-1">
                  {["#0FA350", "#8A10AE", "#E26A10"].map((c) => (
                    <span key={c} className="h-1.5 w-6 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </span>
              </span>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="btn btn-primary flex-1 !py-3.5"
            disabled={busy !== null || alreadyPaid}
            onClick={() => void handlePay()}
          >
            {busy === "pay" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Processing…
              </>
            ) : alreadyPaid ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Already submitted
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4" aria-hidden="true" /> Pay {formatIDR(o.total)}
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-ghost flex-1 !py-3.5"
            disabled={busy !== null}
            onClick={() => void handleCancel()}
          >
            {busy === "cancel" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cancelling…
              </>
            ) : (
              "Cancel"
            )}
          </button>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-foreground/50">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <Link to="/checkout" className="hover:text-gold-300">
            Back to checkout without paying
          </Link>
        </p>
      </div>
    </div>
  );
}