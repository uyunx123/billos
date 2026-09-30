import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Truck,
} from "lucide-react";
import type { Order } from "../context/StoreContext";
import { useCourier } from "../context/CourierContext";
import {
  courierName,
  courierTrackUrl,
  STATUS_KEY_LABEL,
  type CourierStatusKey,
} from "../lib/courier";
import { formatDateTime } from "../lib/format";

const STATUS_STYLES: Record<CourierStatusKey, string> = {
  awaiting: "bg-gold-500/15 text-gold-300",
  picked: "bg-primary/10 text-primary-400",
  transit: "bg-primary/10 text-primary-400",
  delivered: "bg-primary/10 text-primary-400",
  cancelled: "bg-destructive/10 text-destructive",
  unknown: "bg-foreground/10 text-foreground/60",
};

/** Live courier tracking for one order: AWB, status pill, refresh + a short
 *  history. Auto-refreshes every 60s while it's on screen. */
export default function CourierTrackingCard({
  order,
  expanded,
}: {
  order: Order;
  expanded?: boolean;
}) {
  const { tracking, loading, error, refreshTracking } = useCourier();
  const live = tracking[order.id] ?? null;
  const isLoading = loading[order.id] ?? false;
  const err = error[order.id] ?? null;
  const [copied, setCopied] = useState(false);

  const hasAwb = Boolean(order.awb && order.courierCode);

  useEffect(() => {
    if (!hasAwb) return;
    void refreshTracking(order.id);
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void refreshTracking(order.id);
    }, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.awb, order.courierCode]);

  async function copyAwb() {
    if (!order.awb) return;
    try {
      await navigator.clipboard.writeText(order.awb);
    } catch {
      /* clipboard blocked — ignore */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!hasAwb) {
    if (!expanded) return null;
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
          <Truck className="h-4 w-4 text-primary-400" aria-hidden="true" /> Courier tracking
        </p>
        <p className="mt-1 text-sm text-foreground/55">
          The store hasn&apos;t attached a tracking number yet — it appears here the moment your
          parcel ships.
        </p>
      </div>
    );
  }

  const trackUrl = courierTrackUrl(order.courierCode, order.awb);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-2" aria-label="Courier tracking">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-400">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-sm font-bold">{courierName(order.courierCode)}</p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-foreground/55">
              <span className="font-mono font-bold text-primary-400">{order.awb}</span>
              <button
                type="button"
                onClick={() => void copyAwb()}
                className="btn btn-ghost !h-6 !px-1.5 !py-0 text-[11px]"
                aria-label="Copy tracking number"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-primary-400" aria-hidden="true" />
                ) : (
                  <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
              {trackUrl && (
                <a
                  href={trackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-primary-400 hover:underline"
                >
                  Track on {courierName(order.courierCode)}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {live && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                STATUS_STYLES[live.statusKey] ?? STATUS_STYLES.unknown
              }`}
            >
              {STATUS_KEY_LABEL[live.statusKey]}
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost !px-3 !py-1.5 text-xs"
            onClick={() => void refreshTracking(order.id)}
            disabled={isLoading}
            aria-label="Refresh tracking"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3.5">
        {isLoading && !live ? (
          <p className="flex items-center gap-2 text-sm text-foreground/55">
            <Loader2 className="h-4 w-4 animate-spin text-primary-400" aria-hidden="true" />
            Pulling the courier&apos;s latest update…
          </p>
        ) : err ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-foreground/70">{err}</span>
            <Link to="/contact" className="btn btn-outline !px-3 !py-1 text-xs">
              Contact the store
            </Link>
          </div>
        ) : live && live.status ? (
          <>
            <p className="text-sm font-semibold text-foreground">{live.status}</p>
            {live.updatedAt && (
              <p className="mt-0.5 text-xs text-foreground/50">Last updated {formatDateTime(live.updatedAt)}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-foreground/55">
            Tracking number attached — live updates appear here shortly.
          </p>
        )}

        {live && live.history.length > 0 && (
          <ol className="mt-3 space-y-0 border-t border-border pt-3">
            {live.history.slice(0, 4).map((h, i, shown) => (
              <li key={`${h.time}-${i}`} className="relative flex gap-3 pb-3 last:pb-0">
                <span
                  className={`relative mt-1.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                    i === 0 ? "bg-primary" : "bg-foreground/15"
                  }`}
                  aria-hidden="true"
                >
                  {i === 0 && <span className="h-1.5 w-1.5 rounded-full bg-on-primary" />}
                </span>
                {i !== shown.length - 1 && (
                  <span className="absolute left-2 top-7 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-foreground/75">{h.note}</p>
                  {h.time && (
                    <p className="mt-0.5 text-[11px] font-semibold text-foreground/45">{formatDateTime(h.time)}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {expanded && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-foreground/50">
            Auto-refreshes every minute while this page is open.
          </p>
        )}
      </div>
    </section>
  );
}