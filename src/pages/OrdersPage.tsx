import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LogIn, PackageCheck, PackageOpen, PackageSearch, ReceiptText, Search, Star, Truck } from "lucide-react";
import { useStore, type Order, type OrderStatus } from "../context/StoreContext";
import { useAuth } from "../context/AuthContext";
import { useReviews, type ReviewInput } from "../context/ReviewContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { formatIDR } from "../lib/format";
import OrderTimeline from "../components/OrderTimeline";
import ReviewModal from "../components/ReviewModal";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-gold-100 text-gold-200",
  Paid: "bg-primary/10 text-primary-200",
  Prepared: "bg-primary/10 text-primary-200",
  Shipped: "bg-primary/10 text-primary-200",
  Picked: "bg-primary/10 text-primary-200",
  "In transit": "bg-primary/10 text-primary-200",
  Delivered: "bg-primary/10 text-primary-200",
  Cancelled: "bg-destructive/10 text-destructive",
};

const PAYMENT_LABELS: Record<Order["paymentStatus"], string> = {
  pending: "Payment pending",
  submitted: "Payment submitted — awaiting confirmation",
  accepted: "Payment accepted",
  declined: "Payment declined",
  refunded: "Refunded",
};

const PAYMENT_STYLES: Record<Order["paymentStatus"], string> = {
  pending: "bg-white/5 text-foreground/60",
  submitted: "bg-gold-100 text-gold-200",
  accepted: "bg-primary/10 text-primary-200",
  declined: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
};

export default function OrdersPage() {
  const { orders, setOrderStatus, confirmReceived } = useStore();
  const { user, openAuth } = useAuth();
  const [query, setQuery] = useState("");

  usePageMeta({
    title: "My orders — ISAK Billiard Co.",
    description: "Track your ISAK Billiard Co. orders in real time — every status change with its timestamp.",
  });

  const myOrders = user
    ? orders.filter((o) => o.email?.toLowerCase() === user.email.toLowerCase())
    : orders;

  if (myOrders.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/25 text-primary-200 ring-1 ring-primary-400/40">
          <PackageOpen className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">No orders yet</h1>
        <p className="mt-2 text-foreground/60">
          {user
            ? "Nothing here yet — your next rack of gear is waiting in the shop."
            : "Orders you place as a guest show up here in this browser. Sign in to keep every order tied to your account."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!user && (
            <button type="button" className="btn btn-outline" onClick={() => openAuth("signin")}>
              <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in
            </button>
          )}
          <Link to="/shop" className="btn btn-accent">
            Browse the shop <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? myOrders.filter((o) =>
        [
          o.id,
          o.customer,
          o.email ?? "",
          o.status,
          PAYMENT_LABELS[o.paymentStatus],
          ...o.items.map((it) => it.name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    : myOrders;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="eyebrow">Order history</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">My orders</h1>
        <p className="mt-1 text-foreground/60">
          {user ? `${myOrders.length} order${myOrders.length === 1 ? "" : "s"} on your account.` : "Orders placed from this browser."}
        </p>
        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" aria-hidden="true" />
          <label htmlFor="orders-search" className="sr-only">Search your orders</label>
          <input
            id="orders-search"
            type="search"
            className="input !pl-10"
            placeholder="Search order ID, product or status…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card px-5 py-14 text-center">
          <PackageSearch className="mx-auto h-10 w-10 text-foreground/25" aria-hidden="true" />
          <p className="mt-4 font-heading text-lg font-bold">No orders match your search</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/55">
            Nothing matches “{query.trim()}” — try an order number, product name or status like “delivered”.
          </p>
        </div>
      ) : (
        <ul className="space-y-6">
          {filtered.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            onStatus={(status) => setOrderStatus(o.id, status)}
            onConfirm={() => confirmReceived(o.id)}
          />
        ))}
      </ul>
      )}

      <p className="mt-8 text-center text-sm text-foreground/55">
        Track a marketplace order from our official{" "}
        <Link to="/contact" className="font-bold text-primary-200 hover:underline">Shopee / Tokopedia stores</Link> —
        those live outside this site.
      </p>
    </div>
  );
}

function OrderCard({
  order: o,
  onStatus,
  onConfirm,
}: {
  order: Order;
  onStatus: (status: OrderStatus) => void;
  onConfirm: () => void;
}) {
  const pickedUp = o.status === "Shipped";
  const readyToDeliver = o.status === "Picked" || o.status === "In transit";
  const awaitingStore = o.paymentStatus === "submitted" && o.status === "Pending";
  const { reviewForOrderItem, addReview } = useReviews();
  const [reviewTarget, setReviewTarget] = useState<{ productId: string; name: string } | null>(null);

  function submitReview(input: ReviewInput) {
    addReview(input);
    setReviewTarget(null);
  }

  return (
    <li className="card overflow-hidden">
      {reviewTarget && (
        <ReviewModal
          orderId={o.id}
          productId={reviewTarget.productId}
          productName={reviewTarget.name}
          author={o.customer}
          onClose={() => setReviewTarget(null)}
          onSave={submitReview}
          existing={reviewForOrderItem(o.id, reviewTarget.productId)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <p className="font-heading font-bold">{o.id}</p>
          <p className="text-xs text-foreground/55">
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(o.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${PAYMENT_STYLES[o.paymentStatus]}`}>
            {PAYMENT_LABELS[o.paymentStatus]}
          </span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[o.status] ?? "bg-white/5 text-foreground/60"}`}>
            {o.status}
          </span>
        </div>
      </div>

      <div className="px-5 py-4">
        <ul className="space-y-1.5 text-sm">
          {o.items.map((it) => (
            <li key={it.productId + it.name + it.price + it.qty} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2.5">
                <img src={it.image} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white/5 object-cover" />
                <span className="min-w-0 truncate text-foreground/75">{it.name} × {it.qty}</span>
              </span>
              <span className="shrink-0 font-semibold">{formatIDR(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-foreground/55">Subtotal</dt><dd className="font-semibold">{formatIDR(o.subtotal)}</dd></div>
          {o.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-foreground/55">{o.couponCode ? `Coupon (${o.couponCode})` : "Discount"}</dt>
              <dd className="font-semibold text-gold-200">−{formatIDR(o.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between"><dt className="text-foreground/55">Shipping ({o.carrier})</dt><dd className="font-semibold">{formatIDR(o.shipping)}</dd></div>
          <div className="flex justify-between pt-1"><dt className="font-bold">Total</dt><dd className="font-heading text-lg font-bold text-primary-200">{formatIDR(o.total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-foreground/50">
          {o.payment}
          {o.province && o.city ? ` · delivering to ${o.city}, ${o.province}` : o.city ? ` · delivering to ${o.city}` : ""}
        </p>

        {awaitingStore && (
          <p className="mt-3 rounded-xl border border-gold-300/40 bg-gold-100/50 px-3.5 py-2.5 text-sm font-semibold text-gold-200">
            Payment received — the store confirms each payment before packing. We&apos;ll update this page the moment it&apos;s accepted.
          </p>
        )}

        <div className="mt-4 border-t border-border pt-4">
          <OrderTimeline order={o} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link to={`/receipt/${encodeURIComponent(o.id)}`} className="btn btn-outline !px-4 !py-2 text-sm">
            <ReceiptText className="h-4 w-4" aria-hidden="true" /> View receipt
          </Link>
          {pickedUp && o.paymentStatus === "accepted" && (
            <button type="button" className="btn btn-outline !px-4 !py-2 text-sm" onClick={() => onStatus("Picked")}>
              <PackageCheck className="h-4 w-4" aria-hidden="true" /> Courier picked it up
            </button>
          )}
          {readyToDeliver && (
            <button type="button" className="btn btn-primary !px-4 !py-2 text-sm" onClick={() => onStatus("Delivered")}>
              <PackageOpen className="h-4 w-4" aria-hidden="true" /> Confirm delivered
            </button>
          )}
          {o.status === "Delivered" && !o.received && o.paymentStatus !== "refunded" && (
            <button type="button" className="btn btn-primary !px-4 !py-2 text-sm" onClick={onConfirm}>
              <PackageCheck className="h-4 w-4" aria-hidden="true" /> I&apos;ve received it — confirm
            </button>
          )}
          {o.received && (
            <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-primary-200">
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                Order confirmed — thanks! How did your gear play?
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {o.items.map((it) => {
                  const existing = reviewForOrderItem(o.id, it.productId);
                  return existing ? (
                    <span key={it.productId} className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-xs font-bold text-gold-200">
                      <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" aria-hidden="true" />
                      {it.name.slice(0, 26).trim()}… rated {existing.rating}★
                    </span>
                  ) : (
                    <button
                      key={it.productId}
                      type="button"
                      className="btn btn-outline !px-3.5 !py-1.5 text-xs"
                      onClick={() => setReviewTarget({ productId: it.productId, name: it.name })}
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" /> Review {it.name.slice(0, 22).trim()}…
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {o.status === "Delivered" && o.received === undefined && o.paymentStatus === "refunded" && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
              This order was refunded — no review needed.
            </p>
          )}
          {o.status === "Prepared" && (
            <p className="flex items-center gap-1.5 text-xs text-foreground/55">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Packed and waiting for the courier.
            </p>
          )}
        </div>
      </div>
    </li>
  );
}