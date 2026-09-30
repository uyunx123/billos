import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PackageSearch, Search } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { usePageMeta } from "../hooks/usePageMeta";
import { formatIDR } from "../lib/format";
import OrderTimeline from "../components/OrderTimeline";
import CourierTrackingCard from "../components/CourierTrackingCard";

/** Public parcel tracker: /track and /track/:orderId — accepts an order ID
 *  (ISAK-…) or a courier tracking number for orders placed in this browser. */
export default function TrackOrderPage() {
  const { orderId } = useParams<{ orderId?: string }>();
  const { orders } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const order = useMemo(() => {
    if (!orderId) return undefined;
    const q = orderId.trim().toUpperCase();
    return orders.find((o) => o.id.toUpperCase() === q || (o.awb ?? "").toUpperCase() === q);
  }, [orderId, orders]);

  usePageMeta({
    title: order ? `Track ${order.id} — ISAK Billiard Co.` : "Track your order — ISAK Billiard Co.",
    description:
      "Follow your ISAK Billiard Co. parcel live — courier status, tracking history and delivery updates.",
  });

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/track/${encodeURIComponent(q)}`);
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/100/25 text-primary-400 ring-1 ring-primary-400/40">
          <PackageSearch className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold">
          {orderId ? "We couldn't find that parcel" : "Track your order"}
        </h1>
        <p className="mt-2 text-foreground/60">
          {orderId
            ? "Check the number you entered — an order ID (like ISAK-12345-67) or the courier tracking number both work."
            : "Enter your order ID or courier tracking number to follow the parcel live."}
        </p>
        <form onSubmit={handleSearch} className="mx-auto mt-6 flex max-w-sm gap-2">
          <label htmlFor="track-search" className="sr-only">
            Order ID or tracking number
          </label>
          <input
            id="track-search"
            className="input min-w-0 flex-1"
            placeholder="Order ID or tracking number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary shrink-0">
            <Search className="h-4 w-4" aria-hidden="true" /> Find
          </button>
        </form>
        <p className="mt-4 text-xs text-foreground/45">
          Tracking works for orders placed in this browser. Need help?{" "}
          <Link to="/contact" className="font-bold text-primary-400 hover:underline">
            Contact the store
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/orders" className="btn btn-ghost -ml-2">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My orders
      </Link>

      <div className="mb-8 mt-6">
        <p className="eyebrow">Live tracking</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">{order.id}</h1>
        <p className="mt-1 text-foreground/60">
          {order.carrier} · {formatIDR(order.total)} · placed{" "}
          {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
            new Date(order.createdAt)
          )}
        </p>
      </div>

      <CourierTrackingCard order={order} expanded />

      <div className="card mt-6 p-5 sm:p-6">
        <OrderTimeline order={order} />
      </div>
    </div>
  );
}