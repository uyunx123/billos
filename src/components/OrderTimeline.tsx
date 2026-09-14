import {
  Banknote,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  PackageCheck,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { ORDER_FLOW, type Order } from "../context/StoreContext";
import { formatDateTime } from "../lib/format";

const STEP_ICONS: Record<string, LucideIcon> = {
  Pending: Clock,
  Paid: Banknote,
  Prepared: Package,
  Shipped: Truck,
  Picked: PackageCheck,
  "In transit": MapPin,
  Delivered: CheckCircle2,
};

const STEP_HINTS: Record<string, string> = {
  Pending: "Order placed",
  Paid: "Payment confirmed",
  Prepared: "Being packed",
  Shipped: "With the courier",
  Picked: "Courier picked it up",
  "In transit": "On the road to you",
  Delivered: "Arrived",
};

/** Vertical event log + horizontal step rail for a single order. */
export default function OrderTimeline({ order }: { order: Order }) {
  const cancelled = order.status === "Cancelled";
  const currentIdx = ORDER_FLOW.indexOf(order.status);

  return (
    <div>
      {cancelled ? (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm">
          <XCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-destructive">
            This order was cancelled{order.events.length > 1 ? " — the reason is in the timeline below" : ""}.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/45">
            Shipment progress
          </p>
          <ol className="grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Order progress">
            {ORDER_FLOW.map((step, i) => {
              const Icon = STEP_ICONS[step];
              const done = i <= currentIdx;
              return (
                <li key={step} className="flex flex-col items-center gap-2 text-center">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-full ring-2 transition-colors ${
                      done
                        ? "bg-primary text-on-primary ring-primary"
                        : "bg-white/5 text-foreground/35 ring-border"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`text-[10px] leading-tight sm:text-[11px] ${done ? "font-bold text-foreground" : "text-foreground/45"}`}>
                    {STEP_HINTS[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <p className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/45">
        Activity log
      </p>
      <ol className="relative space-y-0" aria-label="Order activity">
        {[...order.events].reverse().map((ev, idx, arr) => {
          const isLast = idx === arr.length - 1;
          return (
            <li key={`${ev.at}-${idx}`} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[11px] top-8 h-[calc(100%-2rem)] w-px bg-border"
                  aria-hidden="true"
                />
              )}
              <span className="relative mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-primary bg-background">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{ev.label}</p>
                {ev.note && <p className="mt-0.5 text-sm text-foreground/60">{ev.note}</p>}
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/45">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <time dateTime={ev.at}>{formatDateTime(ev.at)}</time>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}